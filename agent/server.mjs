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
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import http from 'node:http';
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

/** 默认服务清单：配置文件不存在或解析失败时的兜底 */
const DEFAULT_SERVICES = [
  {
    id: 'my-dashboard',
    name: 'my-dashboard',
    description: '个人工作台（Vite + React）',
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

/**
 * 根据日志尾部判定编译/启动状态。
 * 取所有 success/fail 标记在日志中的最后出现位置，按时间先后判定。
 */
function classifyBuild(config, tail, running) {
  if (!running) return 'stopped';

  const lower = tail.toLowerCase();
  let failIdx = -1;
  let okIdx = -1;

  for (const marker of config.failMarkers) {
    const idx = lower.lastIndexOf(marker.toLowerCase());
    if (idx > failIdx) failIdx = idx;
  }
  for (const marker of config.successMarkers) {
    const idx = lower.lastIndexOf(marker.toLowerCase());
    if (idx > okIdx) okIdx = idx;
  }

  if (failIdx > okIdx) return 'fail';
  if (okIdx >= 0) return 'ok';
  return 'starting';
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
      lastStartedAt: null,
      lastExit: null,
      lastOutcome: null,
      stopInitiatedAt: null,
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
    running,
    pids,
    build,
    lastStartedAt,
    lastExit,
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
    });
    closeSync(logFd);

    child.once('exit', (code, signal) => {
      entry.lastExit = { code, signal, at: new Date().toISOString() };
      // 主动停止或正常退出视为 stopped；其余非零退出视为崩溃失败
      entry.lastOutcome =
        entry.stopInitiatedAt !== null || code === 0 ? 'stopped' : 'failed';
      entry.child = null;
    });
    child.once('error', (error) => {
      entry.lastExit = { code: 'spawn-error', signal: null, at: new Date().toISOString(), message: error.message };
      entry.lastOutcome =
        entry.stopInitiatedAt !== null ? 'stopped' : 'failed';
      entry.child = null;
    });

    entry.child = child;
    entry.lastOutcome = null; // 进入启动阶段，等待就绪/失败标记
    child.unref();
    entry.lastStartedAt = new Date().toISOString();

    return { id, started: true, pid: child.pid };
  } catch (error) {
    const err = new Error(`启动 ${id} 失败: ${error.message}`);
    err.status = 500;
    throw err;
  }
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
  return { id: null, action: null };
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

    if (parsed && parsed.action === 'start' && req.method === 'POST') {
      sendJson(res, 200, await startService(parsed.id));
      return;
    }

    if (parsed && parsed.action === 'stop' && req.method === 'POST') {
      sendJson(res, 200, await stopService(parsed.id));
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
