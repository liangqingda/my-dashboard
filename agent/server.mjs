#!/usr/bin/env node
/**
 * My Dashboard — 本机服务 agent
 *
 * 一个零依赖的本地控制服务：负责探测本机各开发服务是否在运行、
 * 读取其日志并判定编译/启动状态、以及启停这些服务。
 * 仅监听 127.0.0.1（不对外暴露），前端通过 Vite 的 /api 代理访问。
 *
 * 服务清单：agent/services.json
 * 日志目录：agent/logs/<serviceId>.log
 * 端口：默认 8787，可用环境变量 AGENT_PORT 覆盖。
 *
 * API：
 *   GET  /api/health               健康检查
 *   GET  /api/services             所有服务状态
 *   GET  /api/services/:id         单个服务状态
 *   GET  /api/services/:id/log     日志尾部 ?lines=N
 *   POST /api/services/:id/start   启动服务
 *   POST /api/services/:id/stop    停止服务
 */
import { execFile as execFileCb, spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(AGENT_DIR, '..');
const LOG_DIR = path.join(AGENT_DIR, 'logs');
const CONFIG_FILE = path.join(AGENT_DIR, 'services.json');

const HOST = process.env.AGENT_HOST || '127.0.0.1';
const PORT = Number(process.env.AGENT_PORT || 8787);
const DEFAULT_LINES = 60;

/** 启动命令超时：命令卡住且服务始终未就绪时判定启动失败，避免无限等待 */
const START_TIMEOUT_MS = Number(process.env.AGENT_START_TIMEOUT || 60_000);

/** 默认服务清单：配置文件不存在或解析失败时的兜底 */
const DEFAULT_SERVICES = [
  {
    id: 'my-dashboard',
    name: 'my-dashboard',
    description: '个人工作台',
    cwd: ROOT,
    port: 3000,
    startCmd: ['pnpm', 'dev'],
    stopCmd: ['pnpm', 'stop:dev'],
    detectPatterns: [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')],
    successMarkers: ['ready in', 'local:', 'vite v', 'built in', 'compiled'],
    failMarkers: ['error during build', 'failed to resolve', 'eaddrinuse', 'syntaxerror', 'typeerror', '[vite] error', 'failed to compile'],
  },
];

/* ------------------------------------------------------------------ */
/* 工具函数                                                             */
/* ------------------------------------------------------------------ */

/** 解析命令行可执行文件的绝对路径（优先 pnpm），找不到则原样返回 */
async function resolveBin(bin) {
  try {
    const { stdout } = await execFile('which', [bin]);
    const resolved = stdout.trim();
    if (resolved) return resolved;
  } catch {
    /* 无 which 或未找到，回退使用原始命令名 */
  }
  return bin;
}

/** 用 pgrep -f 匹配一组进程模式，返回去重后的 pid 列表 */
async function detectPids(patterns) {
  const pids = new Set();
  for (const pattern of patterns) {
    try {
      const { stdout } = await execFile('pgrep', ['-f', pattern]);
      for (const line of stdout.split('\n')) {
        const pid = Number(line.trim());
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    } catch (err) {
      // pgrep 退出码 1 表示无匹配，是正常情况
      if (err.code !== 1) {
        console.error(`[agent] pgrep "${pattern}" 失败:`, err.message);
      }
    }
  }
  return [...pids];
}

/** 读取文件尾部若干行；文件不存在返回空串 */
async function readTail(file, lines) {
  try {
    const data = await readFile(file, 'utf8');
    return data.split('\n').slice(-lines).join('\n');
  } catch {
    return '';
  }
}

/** 正则转义：把标记文本中的特殊字符转义为字面量 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在文本中查找某个标记的“最后出现位置”。
 * 按整词边界匹配：标记两侧不能紧贴字母/数字/下划线，
 * 避免 `Errors/NotFound.tsx` 里的 "error"、`restarted` 里的 "started" 误命中。
 */
function lastMarkerIndex(text, marker) {
  const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(marker)}(?![A-Za-z0-9_])`, 'ig');
  let last = -1;
  for (const m of text.matchAll(re)) last = m.index;
  return last;
}

/**
 * 根据日志尾部判定编译/启动状态。
 * 取所有 success/fail 标记在日志中的最后出现位置，按时间先后判定；
 * 标记按整词匹配，防止路径/变量名里的片段误判为编译失败。
 */
function classifyBuild(config, tail, running) {
  if (!running) return 'stopped';

  // 需忽略的日志行：命中失败标记但所在行符合忽略模式的，不计入失败
  // （如 redis 未启动产生的 [redis] client error，不代表编译/启动失败）
  const ignoreRes = (config.failIgnorePatterns ?? []).map(
    (pattern) => new RegExp(pattern, 'i'),
  );

  let failIdx = -1;
  let okIdx = -1;

  for (const marker of config.failMarkers) {
    const re = new RegExp(
      `(?<![A-Za-z0-9_])${escapeRegExp(marker)}(?![A-Za-z0-9_])`,
      'ig',
    );

    for (const match of tail.matchAll(re)) {
      const lineStart = tail.lastIndexOf('\n', match.index) + 1;
      const lineEnd = tail.indexOf('\n', match.index);
      const line = tail.slice(lineStart, lineEnd === -1 ? tail.length : lineEnd);
      const ignored = ignoreRes.some((reIgnore) => reIgnore.test(line));

      if (!ignored) {
        failIdx = match.index;
      }
    }
  }
  for (const marker of config.successMarkers) {
    const idx = lastMarkerIndex(tail, marker);
    if (idx > okIdx) okIdx = idx;
  }

  if (failIdx > okIdx) return 'fail';
  return 'ok';
}

/** 递归终止进程及其全部子进程 */
async function killTree(pid) {
  const children = await getChildren(pid);
  for (const child of children) await killTree(child);
  await killPid(pid);
}

/** 获取某 pid 的直接子进程 pid 列表 */
async function getChildren(pid) {
  try {
    const { stdout } = await execFile('pgrep', ['-P', String(pid)]);
    return stdout
      .split('\n')
      .map((line) => Number(line.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

/** 先 SIGTERM，短暂等待后 SIGKILL，尽力确保进程结束 */
async function killPid(pid) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* 进程可能已退出 */
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* 已退出 */
  }
}

/* ------------------------------------------------------------------ */
/* 配置与服务状态                                                       */
/* ------------------------------------------------------------------ */

/** 读取并解析服务清单；失败回退默认清单并写回一份可编辑的配置文件 */
async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[agent] 服务清单解析失败，使用默认清单:', err.message);
    }
    try {
      await mkdir(AGENT_DIR, { recursive: true });
      await appendFile(
        CONFIG_FILE,
        `${JSON.stringify(DEFAULT_SERVICES, null, 2)}\n`,
        'utf8',
      );
    } catch {
      /* 只读环境，忽略 */
    }
    return DEFAULT_SERVICES;
  }
}

/** 运行时服务注册表：id -> { config, child, lastStartedAt, lastExit, logPath } */
const registry = new Map();
let pnpmBin = 'pnpm';

async function init() {
  await mkdir(LOG_DIR, { recursive: true });
  pnpmBin = await resolveBin('pnpm');
  const configs = await loadConfig();

  for (const config of configs) {
    registry.set(config.id, {
      config,
      child: null,
      startTimer: null,
      lastStartedAt: null,
      lastExit: null,
      lastOutcome: null,
      stopInitiatedAt: null,
      deployChild: null,
      deployState: null,
      lastDeployAt: null,
      logPath: path.join(LOG_DIR, `${config.id}.log`),
    });
  }
}

/** 组装单条服务的状态快照 */
async function getStatus(entry) {
  const { config, lastStartedAt, lastExit } = entry;
  const pids = await detectPids(config.detectPatterns);
  const running = pids.length > 0;
  const tail = await readTail(entry.logPath, DEFAULT_LINES);

  let build = classifyBuild(config, tail, running);
  // 进程不在运行且上次是崩溃退出（非主动停止、非正常退出）→ 标记失败
  if (!running && entry.lastOutcome === 'failed') {
    build = 'fail';
  }

  return {
    id: config.id,
    name: config.name,
    description: config.description ?? '',
    cwd: config.cwd,
    port: config.port ?? null,
    portLabel: config.portLabel ?? null,
    extraPorts: Array.isArray(config.extraPorts)
      ? config.extraPorts.map((p) => (typeof p === 'number' ? { port: p } : p))
      : [],
    // url 显式给 null 表示不可访问的后端服务（数据库等），不自动拼 http 地址
    url: config.url !== undefined ? config.url : (config.port ? `http://localhost:${config.port}` : null),
    repo: config.repo ?? null,
    autoStart: config.autoStart ?? false,
    running,
    pids,
    build,
    lastStartedAt,
    lastExit,
    deploying: entry.deployState === 'running',
    deployOutcome:
      entry.deployState === 'success' || entry.deployState === 'failed'
        ? entry.deployState
        : null,
    lastDeployAt: entry.lastDeployAt,
    canDeploy: Array.isArray(config.deployCmd) && config.deployCmd.length > 0,
    log: tail,
    logLines: tail ? tail.split('\n').length : 0,
    startCmd: config.startCmd,
    stopCmd: config.stopCmd ?? [],
    detectPatterns: config.detectPatterns ?? [],
    successMarkers: config.successMarkers ?? [],
    failMarkers: config.failMarkers ?? [],
  };
}

/** 启动服务：追加日志横幅，detached 拉起进程，stdout/stderr 直写日志文件 */
async function startService(id) {
  const entry = registry.get(id);
  if (!entry) {
    const err = new Error(`未知服务 "${id}"`);
    err.status = 404;
    throw err;
  }

  const pids = await detectPids(entry.config.detectPatterns);
  if (pids.length > 0) {
    return { id, alreadyRunning: true, pids };
  }
  if (entry.child && entry.child.exitCode === null) {
    return { id, alreadyRunning: true, pid: entry.child.pid };
  }

  const [cmd, ...args] = entry.config.startCmd;
  const banner = `\n==== ${new Date().toISOString()}  启动 ${id} ====\n`;

  try {
    await appendFile(entry.logPath, banner, 'utf8');
    const logFd = openSync(entry.logPath, 'a');
    const child = spawn(cmd, args, {
      cwd: entry.config.cwd,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, ...(entry.config.env ?? {}) },
    });
    closeSync(logFd);

    child.once('exit', (code, signal) => {
      clearTimeout(entry.startTimer);
      entry.startTimer = null;
      entry.lastExit = { code, signal, at: new Date().toISOString() };
      // 主动停止或正常退出视为 stopped；其余非零退出视为崩溃失败
      entry.lastOutcome =
        entry.stopInitiatedAt !== null || code === 0 ? 'stopped' : 'failed';
      entry.child = null;
    });
    child.once('error', (error) => {
      clearTimeout(entry.startTimer);
      entry.startTimer = null;
      entry.lastExit = { code: 'spawn-error', signal: null, at: new Date().toISOString(), message: error.message };
      entry.lastOutcome =
        entry.stopInitiatedAt !== null ? 'stopped' : 'failed';
      entry.child = null;
    });

    entry.child = child;
    entry.lastOutcome = null; // 进入启动阶段，等待就绪/失败标记
    child.unref();
    entry.lastStartedAt = new Date().toISOString();

    // 启动超时兜底：命令卡住且服务始终未被探测到，判定启动失败并清理进程树
    entry.startTimer = setTimeout(() => {
      void (async () => {
        const alive = entry.child && entry.child.exitCode === null;
        const pids = await detectPids(entry.config.detectPatterns);

        if (alive && pids.length === 0) {
          entry.lastOutcome = 'failed';
          entry.lastExit = {
            code: 'start-timeout',
            signal: null,
            at: new Date().toISOString(),
            message: '启动超时：命令卡住且服务未就绪',
          };
          entry.child = null;
          try {
            await killTree(child.pid);
          } catch {
            /* 进程已退出 */
          }
        }
      })();
    }, START_TIMEOUT_MS);

    return { id, started: true, pid: child.pid };
  } catch (error) {
    const err = new Error(`启动 ${id} 失败: ${error.message}`);
    err.status = 500;
    throw err;
  }
}

/** 重新部署服务（如构建并上传到 CloudBase）。一次性命令，输出写入服务日志。 */
async function deployService(id) {
  const entry = registry.get(id);

  if (!entry) {
    const err = new Error(`未知服务 "${id}"`);
    err.status = 404;
    throw err;
  }

  const cmd = entry.config.deployCmd;

  if (!cmd || cmd.length === 0) {
    const err = new Error(`服务 "${id}" 未配置部署命令（deployCmd）`);
    err.status = 400;
    throw err;
  }

  if (entry.deployState === 'running') {
    return { id, deploying: true, alreadyDeploying: true };
  }

  const time = new Date().toLocaleTimeString();
  await appendFile(entry.logPath, `\n===== [${time}] 重新部署开始 =====\n`, 'utf8');

  const deployLogFd = openSync(entry.logPath, 'a');
  entry.deployState = 'running';
  entry.deployChild = spawn(cmd[0], cmd.slice(1), {
    cwd: entry.config.cwd,
    env: { ...process.env, ...(entry.config.env || {}) },
    stdio: ['ignore', deployLogFd, deployLogFd],
    detached: true,
  });
  entry.deployChild.unref();

  const finishDeploy = (state) => {
    entry.deployState = state;
    entry.lastDeployAt = new Date().toISOString();
    entry.deployChild = null;
    try {
      closeSync(deployLogFd);
    } catch {
      /* 已关闭 */
    }
  };

  entry.deployChild.once('error', (error) => {
    finishDeploy('failed');
    appendFile(entry.logPath, `===== 部署失败：${error.message} =====\n`, 'utf8').catch(() => {});
  });

  entry.deployChild.once('exit', (code) => {
    const state = code === 0 ? 'success' : 'failed';
    finishDeploy(state);
    appendFile(
      entry.logPath,
      `===== [${new Date().toLocaleTimeString()}] 部署${code === 0 ? '成功' : `失败（exit ${code}）`} =====\n`,
      'utf8',
    ).catch(() => {});
  });

  return { id, deploying: true };
}

/** 运行服务的自定义停止命令（如 pnpm stop:dev），带超时保护 */
function runStopCmd(entry) {
  return new Promise((resolve) => {
    const [cmd, ...args] = entry.config.stopCmd;
    const child = spawn(cmd, args, {
      cwd: entry.config.cwd,
      stdio: 'ignore',
    });
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* 已退出 */
      }
    }, 15_000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.once('error', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** 停止服务：优先走自定义停止命令，再做进程清理兜底 */
async function stopService(id) {
  const entry = registry.get(id);
  if (!entry) {
    const err = new Error(`未知服务 "${id}"`);
    err.status = 404;
    throw err;
  }

  // 记录主动停止时刻，用于区分「正常停止」与「崩溃退出」
  entry.stopInitiatedAt = new Date().toISOString();

  // 停止时取消尚未触发的启动超时
  clearTimeout(entry.startTimer);
  entry.startTimer = null;

  let pids = await detectPids(entry.config.detectPatterns);
  const childAlive = entry.child && entry.child.exitCode === null;

  if (entry.config.stopCmd.length > 0 && (pids.length > 0 || childAlive)) {
    await runStopCmd(entry);
  }

  // 兜底：清理所有仍匹配该服务的进程树
  const remaining = await detectPids(entry.config.detectPatterns);
  for (const pid of remaining) await killTree(pid);

  if (entry.child && entry.child.exitCode === null) {
    await killTree(entry.child.pid);
  }

  const after = await detectPids(entry.config.detectPatterns);
  return { id, stopped: after.length === 0, remaining: after };
}

/* ------------------------------------------------------------------ */
/* HTTP 服务                                                           */
/* ------------------------------------------------------------------ */

/** 写入 JSON 响应 */
function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/** 校验本地来源的 CORS 请求头 */
function applyCors(req, res) {
  const origin = req.headers.origin;
  const host = origin ? new URL(origin).hostname : null;
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1';

  if (isLocal) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/** 把 /api/services/:id/action 的路径拆成 [id, action] */
function parseServicesPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts[1] !== 'services') return null;
  if (parts.length === 2) return { id: null, action: 'list' };
  if (parts.length === 3) return { id: parts[2], action: 'status' };
  if (parts.length === 4) return { id: parts[2], action: parts[3] };
  // /api/services/:id/log/clear
  if (parts.length === 5) return { id: parts[2], action: `${parts[3]}/${parts[4]}` };
  return { id: null, action: null };
}

/* ------------------------------------------------------------------ *
 * 全局 CLI 命令解析：读取 ~/.zshrc，提取别名(alias)与函数(function)  *
 * ------------------------------------------------------------------ */

const ZSHRC = path.join(os.homedir(), '.zshrc');

/** 根据别名取值推断一句说明 */
function aliasDescription(value) {
  if (/python3/.test(value)) return '运行 Python3';
  if (/code\.app|visual studio|\/code(\s|$|")/i.test(value)) return '打开 VS Code';
  return `别名 → ${value.replace(/^["']+|["']+$/g, '')}`;
}

/** 根据函数体推断一句说明 */
function functionDescription(name, text) {
  if (/redis-cli shutdown/.test(text)) return '停止 Redis';
  if (/redis-server/.test(text)) return '启动 Redis';
  if (/brew services/.test(text)) return '管理 Homebrew 服务';
  return 'Shell 函数';
}

/** 推断命令归属分组：redis / postgres / alias / other */
function groupFor(name, text) {
  if (/redis/i.test(text)) return 'redis';
  if (/brew services|postgres/i.test(text)) return 'postgres';
  return 'other';
}

/**
 * 解析 ~/.zshrc，产出可展示的命令条目。
 * - alias name=value → 一条
 * - 函数：若函数体内有 case "$1" 的 start/stop/restart/status 分支则展开为多条子命令；
 *   否则整函数作为一条。
 */
async function parseCliCommands() {
  let text;
  try {
    text = await readFile(ZSHRC, 'utf8');
  } catch {
    return [];
  }

  const lines = text.split('\n');
  const out = [];
  const aliasRe = /^alias\s+([A-Za-z0-9_\-]+)\s*=\s*(.+)$/;
  const funcStartRe = /^([A-Za-z_][A-Za-z0-9_\-]*)\s*\(\s*\)\s*\{/;

  let cur = null; // { name, body: string[] }
  const flush = () => {
    if (!cur) return;
    const textBody = cur.body.join('\n');
    const subs = ['start', 'stop', 'restart', 'status'].filter((s) =>
      new RegExp(`\\b${s}\\b`).test(textBody),
    );
    if (subs.length > 1) {
      const group = groupFor(cur.name, textBody);
      for (const sub of subs) {
        const desc =
          group === 'postgres'
            ? sub === 'status'
              ? '查看 PostgreSQL 状态'
              : `${sub === 'start' ? '启动' : sub === 'stop' ? '停止' : '重启'} PostgreSQL`
            : `${cur.name} ${sub}`;
        out.push({ name: `${cur.name} ${sub}`, type: 'function', desc, group });
      }
    } else {
      out.push({
        name: cur.name,
        type: 'function',
        desc: functionDescription(cur.name, textBody),
        group: groupFor(cur.name, textBody),
      });
    }
    cur = null;
  };

  for (const line of lines) {
    if (cur) {
      cur.body.push(line);
      if (line.includes('}')) flush();
      continue;
    }
    const a = line.match(aliasRe);
    if (a) {
      out.push({
        name: a[1],
        type: 'alias',
        desc: aliasDescription(a[2]),
        group: 'alias',
      });
      continue;
    }
    const f = line.match(funcStartRe);
    if (f) cur = { name: f[1], body: [] };
  }
  flush();
  return out;
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true, pid: process.pid, services: registry.size });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/services') {
      const statuses = await Promise.all([...registry.values()].map(getStatus));
      sendJson(res, 200, statuses);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/cli-commands') {
      const commands = await parseCliCommands();
      sendJson(res, 200, { commands, source: ZSHRC });
      return;
    }

    const parsed = parseServicesPath(pathname);

    if (parsed && parsed.action === 'status') {
      const entry = registry.get(parsed.id);
      if (!entry) {
        sendJson(res, 404, { message: `未知服务 "${parsed.id}"` });
        return;
      }
      sendJson(res, 200, await getStatus(entry));
      return;
    }

    if (parsed && parsed.action === 'log' && req.method === 'GET') {
      const entry = registry.get(parsed.id);
      if (!entry) {
        sendJson(res, 404, { message: `未知服务 "${parsed.id}"` });
        return;
      }
      const lines = Number(url.searchParams.get('lines') ?? DEFAULT_LINES) || DEFAULT_LINES;
      const log = await readTail(entry.logPath, lines);
      sendJson(res, 200, { id: parsed.id, log, lines });
      return;
    }

    if (parsed && parsed.action === 'log/clear' && req.method === 'POST') {
      const entry = registry.get(parsed.id);
      if (!entry) {
        sendJson(res, 404, { message: `未知服务 "${parsed.id}"` });
        return;
      }
      await writeFile(entry.logPath, '', 'utf8');
      sendJson(res, 200, { id: parsed.id, cleared: true });
      return;
    }

    if (parsed && parsed.action === 'start' && req.method === 'POST') {
      sendJson(res, 200, await startService(parsed.id));
      return;
    }

    if (parsed && parsed.action === 'stop' && req.method === 'POST') {
      sendJson(res, 200, await stopService(parsed.id));
      return;
    }

    if (parsed && parsed.action === 'deploy' && req.method === 'POST') {
      sendJson(res, 200, await deployService(parsed.id));
      return;
    }

    sendJson(res, 404, { message: '接口不存在' });
  } catch (error) {
    const status = error.status ?? 500;
    const message =
      status >= 500 ? '服务端内部错误' : error.message;
    if (status >= 500) console.error('[agent]', error.message);
    sendJson(res, status, { message });
  }
});

/* 优雅退出：只关闭服务，不杀掉正在运行的开发服务 */
function shutdown() {
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await init();
server.listen(PORT, HOST, () => {
  console.log(`[agent] my-dashboard agent listening on http://${HOST}:${PORT}`);
  console.log(`[agent] 服务数量: ${registry.size}`);
});
