/**
 * 推出外接盘：先释放本进程持有的读流、`sync` 落盘，再用**普通卸载**（`diskutil eject`，
 * 从不带 `force`）退盘；被别的程序占着时把占用者列出来，用户确认后再结束这些进程重试。
 *
 * 安全底线（别为了让按钮一次成功就放宽）：
 *
 * - 不 `diskutil unmount force`、不 `eject force`：强制卸载会让 exFAT 的元数据与未落盘的写
 *   停在半路，坏的是用户的整块盘；
 * - 结束进程只针对本次 `lsof` 真列出来的占用者，且必须同用户、非系统关键进程；
 *   系统进程（Spotlight、WindowServer 这类）只列出来、不做动作；
 * - 卸载前先 `sync`，把系统缓存里的写落盘再退。
 */

import { execFile } from 'node:child_process';
import { userInfo } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

// 显式 `.ts`：单测用 Node 原生类型剥离直接跑这一层
import { releaseStreamsUnder } from './files-handles.ts';
import { isExternalMount, readMountPoint } from './files-space.ts';

const execFileAsync = promisify(execFile);

/** 占用外接盘的一个进程 */
export type VolumeHolder = {
  /** 进程号 */
  pid: number;
  /** 进程名：`ps` 给的 `comm`，可能是完整可执行路径 */
  name: string;
  /** 跑它的用户名 */
  user: string;
  /** 能不能由本项目结束：同用户、非系统关键进程才可以 */
  canKill: boolean;
  /** 不能结束的原因；能结束时为 null */
  reason: string | null;
};

/** 一次推出请求的结果：`ejected` 表示已安全卸载，`busy` 表示还占着、需要用户决定 */
export type EjectVolumeResult = {
  /** 结果类型 */
  status: 'ejected' | 'busy';
  /** 卷挂载点 */
  mountPoint: string;
  /** 本次释放掉的本进程读流条数 */
  released: number;
  /** 本次结束掉的进程号 */
  killed: number[];
  /** 仍占着盘的进程（已排除本进程自己） */
  holders: VolumeHolder[];
  /** 占用清单是否枚举成功：`lsof` 不可用或超时时为 false */
  holdersKnown: boolean;
  /** 系统给的失败原因；`ejected` 时为空串 */
  message: string;
};

/**
 * 不做自动结束的进程：系统级守护 / 桌面基础设施。杀了它们不是「腾出这块盘」，
 * 是把整台机器的会话弄坏，而这些进程重启后照样会去碰这块盘。
 */
const PROTECTED_PROCESS_NAMES: ReadonlySet<string> = new Set([
  'backupd',
  'diskmanagementd',
  'dock',
  'fseventsd',
  'finder',
  'kernel_task',
  'launchd',
  'loginwindow',
  'mds',
  'mds_stores',
  'mdworker',
  'mdworker_shared',
  'spotlight',
  'windowserver',
]);

/** 结束进程后等它退出的上限；到点还在就升级成 `KILL` */
const TERM_WAIT_MS = 4000;
/** 轮询间隔 */
const POLL_MS = 200;
/** `lsof` 扫一遍整卷的上限：大卷可能很慢，超时就按「列不全」如实收口 */
const LSOF_TIMEOUT_MS = 30_000;

/** 进程名基底：去掉路径与 `.app` 后缀，用于和系统进程名单比对 */
export const processBaseName = (name: string): string =>
  path
    .basename(name.trim())
    .replace(/\.app$/i, '')
    .toLowerCase();

/**
 * `lsof -F pcn` 的分段输出里取出 PID：每个进程以 `p<pid>` 起头，
 * 后面跟着 `c`（命令名）/ `n`（路径）行。
 */
export const parseLsofPids = (output: string): number[] => {
  const pids = new Set<number>();

  for (const line of output.split('\n')) {
    if (!line.startsWith('p')) {
      continue;
    }

    const pid = Number(line.slice(1));

    if (Number.isInteger(pid) && pid > 1) {
      pids.add(pid);
    }
  }

  return [...pids];
};

/** `ps -o pid=,user=,comm=` 的一行输出 */
export type ProcessRow = {
  /** 进程号 */
  pid: number;
  /** 用户名 */
  user: string;
  /** 进程名（可能是完整路径） */
  name: string;
};

/** 解析 `ps` 的批量输出；认不出的行跳过 */
export const parseProcessRows = (output: string): ProcessRow[] => {
  const rows: ProcessRow[] = [];

  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(line);

    if (!match) {
      continue;
    }

    rows.push({ name: match[3], pid: Number(match[1]), user: match[2] });
  }

  return rows;
};

/**
 * 这个进程能不能被自动结束：系统关键进程、别的用户起的进程都不动，
 * 只回不能结束的原因（能结束时返回 null）。
 */
export const unkillableReason = (
  name: string,
  user: string,
  currentUser: string,
): string | null => {
  if (PROTECTED_PROCESS_NAMES.has(processBaseName(name))) {
    return '系统进程，不做自动结束';
  }

  if (user !== currentUser) {
    return `由用户 ${user} 启动，需要你自己关掉`;
  }

  return null;
};

/** 系统缓存里的写落盘；`sync` 不可用时不阻断（卸载本身还会再刷一次） */
const flushDisk = async (): Promise<void> => {
  try {
    await execFileAsync('sync', [], { timeout: 10_000 });
  } catch {
    // `sync` 失败不该让推出流程提前结束，真正的兜底是卸载时的系统检查
  }
};

/** 系统给的原因翻成页面读得懂的一句话；认不出的保留原文，不假装知道原因 */
const readableEjectFailure = (raw: string): string => {
  if (/resource busy|dissented by pid/i.test(raw)) {
    return '这块盘正在被使用，系统拒绝了卸载';
  }

  return raw || '推出外接盘失败';
};

/** 普通卸载；成功返回 null，失败返回系统给的原因 */
const attemptEject = async (mountPoint: string): Promise<string | null> => {
  try {
    await execFileAsync('diskutil', ['eject', mountPoint], { timeout: 30_000 });

    return null;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim() ?? '';

    return readableEjectFailure(stderr);
  }
};

/** 进程是否还活着（`signal 0` 只做存在性检查，不真发信号） */
const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

/** 等一组进程退出；返回到点仍活着的那些 */
const waitForExit = async (pids: number[]): Promise<number[]> => {
  const deadline = Date.now() + TERM_WAIT_MS;
  let alive = pids.filter(isAlive);

  while (alive.length > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    alive = alive.filter(isAlive);
  }

  return alive;
};

/** 先 `TERM` 让程序收尾保存，等不到再 `KILL`；系统不允许时静默跳过（后面会如实报占用） */
const terminateProcesses = async (pids: number[]): Promise<void> => {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // 已经退出或没权限：交给后面的占用复查
    }
  }

  const stubborn = await waitForExit(pids);

  for (const pid of stubborn) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // 同上
    }
  }

  if (stubborn.length > 0) {
    await waitForExit(stubborn);
  }
};

/** 查一条进程的信息；查不到时给一条只有 PID 的占位 */
const readProcessRows = async (pids: number[]): Promise<Map<number, ProcessRow>> => {
  const rows = new Map<number, ProcessRow>();

  if (pids.length === 0) {
    return rows;
  }

  try {
    const { stdout } = await execFileAsync(
      'ps',
      ['-ww', '-p', pids.join(','), '-o', 'pid=,user=,comm='],
      { timeout: 10_000 },
    );

    for (const row of parseProcessRows(stdout)) {
      rows.set(row.pid, row);
    }
  } catch {
    // `ps` 不可用就只列 PID，不假装知道是谁
  }

  return rows;
};

/**
 * 列出还占着这一卷的进程（不含本进程自己）。
 * `lsof +D` 会遍历整卷的打开文件描述符：拿到的是「此刻真的开着文件」的进程，
 * 比按名字猜（IINA / VLC）靠谱。列不全时 `known` 为 false，由调用方如实说明。
 */
const listVolumeHolders = async (
  mountPoint: string,
): Promise<{ holders: VolumeHolder[]; known: boolean }> => {
  const currentUser = userInfo().username;

  let output = '';
  let known = true;

  try {
    const result = await execFileAsync(
      'lsof',
      ['-w', '-nP', '-F', 'pcn', '+D', mountPoint],
      { maxBuffer: 16 * 1024 * 1024, timeout: LSOF_TIMEOUT_MS },
    );

    output = result.stdout;
  } catch (error) {
    const caught = error as { code?: unknown; killed?: boolean; stdout?: string };

    // `lsof` 没找到任何打开文件时以 1 退出，这不算失败
    if (caught.killed === true || Number(caught.code) !== 1) {
      known = false;
    }

    output = typeof caught.stdout === 'string' ? caught.stdout : '';
  }

  const pids = parseLsofPids(output);
  const rows = await readProcessRows(pids);

  const holders = pids.map((pid): VolumeHolder => {
    // 本进程自己还开着这一卷的文件：不能杀自己，但要如实列出来（说明释放没彻底）
    if (pid === process.pid) {
      return {
        canKill: false,
        name: '本站开发服务器（node）',
        pid,
        reason: '本站自己还开着这块盘的文件，稍后会自行释放，可以点「重试推出」',
        user: userInfo().username,
      };
    }

    const row = rows.get(pid);
    const name = row?.name ?? `进程 ${pid}`;
    const user = row?.user ?? '';
    const reason = row === undefined ? '读不到进程信息' : unkillableReason(name, user, currentUser);

    return {
      canKill: reason === null,
      name: path.basename(name),
      pid,
      reason,
      user,
    };
  });

  holders.sort((left, right) => left.pid - right.pid);

  return { holders, known };
};

/** 组一个「还占着」的结果；占用清单为空时也说清是「没列出来」而不是「没人占」 */
const busyResult = (
  mountPoint: string,
  released: number,
  killed: number[],
  holders: VolumeHolder[],
  known: boolean,
  message: string,
): EjectVolumeResult => ({
  holders,
  holdersKnown: known,
  killed,
  message,
  mountPoint,
  released,
  status: 'busy',
});

/**
 * 推出当前目录所在的外接盘。
 *
 * 1. 释放本进程持有的读流（视频 / 图片预览留下的句柄是「自己把盘钉住」的主因）+ `sync`；
 * 2. 普通卸载；成功即返回 `ejected`；
 * 3. 失败就列占用者。第一次调用不带 `killPids`，页面拿清单去问用户；
 *    用户确认后再带一次 `killPids` 重试（只结束清单里同用户、非系统的进程）。
 */
export const ejectVolume = async (
  dir: string,
  killPids: readonly number[] = [],
): Promise<EjectVolumeResult> => {
  if (process.platform !== 'darwin') {
    throw new Error('只有 macOS 支持推出外接盘');
  }

  const mountPoint = await readMountPoint(dir);

  if (mountPoint === null || !isExternalMount(mountPoint, '/')) {
    throw new Error('当前目录不在可推出的外接盘上');
  }

  const released = await releaseStreamsUnder(mountPoint);

  await flushDisk();

  const firstFailure = await attemptEject(mountPoint);

  if (firstFailure === null) {
    return {
      holders: [],
      holdersKnown: true,
      killed: [],
      message: '',
      mountPoint,
      released,
      status: 'ejected',
    };
  }

  let listed = await listVolumeHolders(mountPoint);

  if (killPids.length === 0) {
    return busyResult(
      mountPoint,
      released,
      [],
      listed.holders,
      listed.known,
      firstFailure,
    );
  }

  // 只结束「这次真的列出来、且我们自己判定可以结束」的进程：请求里的 PID 不当授权凭据用
  const targets = listed.holders.filter(
    (holder) => holder.canKill && killPids.includes(holder.pid),
  );

  if (targets.length === 0) {
    return busyResult(
      mountPoint,
      released,
      [],
      listed.holders,
      listed.known,
      `${firstFailure}（这些占用无法由本项目结束，请先自己关掉）`,
    );
  }

  const killed = targets.map((holder) => holder.pid);

  await terminateProcesses(killed);
  await flushDisk();

  const retryFailure = await attemptEject(mountPoint);

  if (retryFailure === null) {
    return {
      holders: [],
      holdersKnown: true,
      killed,
      message: '',
      mountPoint,
      released,
      status: 'ejected',
    };
  }

  listed = await listVolumeHolders(mountPoint);

  return busyResult(mountPoint, released, killed, listed.holders, listed.known, retryFailure);
};
