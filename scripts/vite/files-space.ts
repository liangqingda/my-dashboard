/**
 * 目录所在卷的剩余可用空间：只服务于文件浏览页标题栏的那一句描述。
 *
 * 用 `df -kP <path>` 读：一次同时拿到挂载点与可用块数，POSIX 输出在 macOS / Linux 上一致。
 * 读不到（没有 `df`、路径不可读、输出认不出）一律返回 null，页面就不显示描述——
 * 空间只是附加信息，不能因为它读不到就让目录列表失败。
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** 一个卷的剩余空间 */
export type VolumeSpace = {
  /** 卷名：外接卷取挂载点最后一段（`/Volumes/T7` → `T7`）；启动卷为 null，页面只显示数字 */
  name: string | null;
  /** 挂载点绝对路径（启动卷是 `/`） */
  mountPoint: string;
  /** 剩余可用字节 */
  freeBytes: number;
};

/** 一次目录扫描带的卷空间：启动卷恒有，当前目录在别的卷上时再带那一卷 */
export type DirSpace = {
  /** 本机启动卷（`/`）的剩余可用空间 */
  system: VolumeSpace;
  /** 当前目录所在的外接卷；目录就在启动卷上时为 null */
  external: VolumeSpace | null;
};

/** `df -k` 的一块是 1024 字节 */
const DF_BLOCK_BYTES = 1024;

/** macOS 把用户可挂载的其它卷放在 `/Volumes/` 下；启动卷与其数据卷都不在这个前缀里 */
const EXTERNAL_MOUNT_PREFIX = '/Volumes/';

/**
 * 解析 `df -kP <path>` 的输出：跳过表头，借 Capacity 的百分比列锚定后面的挂载点，
 * 挂载点里带空格（`/Volumes/My Passport`）也整段保留。认不出返回 null。
 */
export const parseDfOutput = (
  stdout: string,
): { freeBytes: number; mountPoint: string } | null => {
  for (const line of stdout.split('\n')) {
    const match = /^\S+\s+\d+\s+\d+\s+(\d+)\s+\d+%\s+(.+)$/.exec(line.trim());

    if (match) {
      return {
        freeBytes: Number(match[1]) * DF_BLOCK_BYTES,
        mountPoint: match[2],
      };
    }
  }

  return null;
};

/** 读一个路径所在卷的挂载点与可用空间；`df` 失败或输出认不出时返回 null */
const readVolume = async (
  target: string,
): Promise<{ freeBytes: number; mountPoint: string } | null> => {
  try {
    const { stdout } = await execFileAsync('df', ['-kP', target]);

    return parseDfOutput(stdout);
  } catch {
    return null;
  }
};

/**
 * 挂载点是不是「另一个卷」：在 `/Volumes/` 下，且不是启动卷自己的挂载点。
 * 只认这个前缀，启动卷的 APFS 数据卷（`/System/Volumes/Data`）与主目录都不会被误判成外接盘。
 */
export const isExternalMount = (
  mountPoint: string,
  systemMountPoint: string,
): boolean =>
  mountPoint.startsWith(EXTERNAL_MOUNT_PREFIX) &&
  mountPoint !== systemMountPoint;

/** 读一个路径实际所在卷的挂载点；读不到返回 null（用于推出外接盘前确认真正要退的是哪一卷） */
export const readMountPoint = async (target: string): Promise<string | null> =>
  (await readVolume(target))?.mountPoint ?? null;

/** 卷名：启动卷没有名字（页面只显示数字）；其它卷取挂载点最后一段 */
const volumeNameOf = (mountPoint: string): string | null =>
  mountPoint === '/' ? null : path.basename(mountPoint) || null;

/**
 * 读目录所在卷的空间，并在它是外接卷时一并带上启动卷的可用空间。
 * 启动卷读不到时整份返回 null；外接卷读不到只是不带那一卷。
 */
export const readDirSpace = async (dir: string): Promise<DirSpace | null> => {
  const [systemVolume, currentVolume] = await Promise.all([
    readVolume('/'),
    readVolume(dir),
  ]);

  if (systemVolume === null) {
    return null;
  }

  const system: VolumeSpace = {
    freeBytes: systemVolume.freeBytes,
    mountPoint: systemVolume.mountPoint,
    name: volumeNameOf(systemVolume.mountPoint),
  };

  const external =
    currentVolume !== null &&
    isExternalMount(currentVolume.mountPoint, systemVolume.mountPoint)
      ? {
          freeBytes: currentVolume.freeBytes,
          mountPoint: currentVolume.mountPoint,
          name: volumeNameOf(currentVolume.mountPoint),
        }
      : null;

  return { external, system };
};
