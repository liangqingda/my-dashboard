import { execFile as execFileCb } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const run = async (bin, args) => {
  try {
    return (
      await execFile(bin, args, { timeout: 5000, maxBuffer: 4 * 1024 * 1024 })
    ).stdout.trim();
  } catch (error) {
    if (error.code === 1) return '';
    throw error;
  }
};
const canonical = async (file) =>
  realpath(file).catch(() => path.resolve(file));

export function belongsToService(process, config) {
  if (config.executable) return process.executable === config.executable;
  const inside =
    process.cwd === config.cwd ||
    process.cwd.startsWith(`${config.cwd}${path.sep}`);
  return inside && /^node(?:\d+)?$/.test(path.basename(process.executable));
}

export async function processIdentity(pid) {
  return run('ps', ['-p', String(pid), '-o', 'lstart=', '-o', 'command=']);
}

/** Only port listeners with a matching executable/project directory are service processes. */
export async function findServiceProcesses(config) {
  const ports = [
    config.port,
    ...(config.extraPorts ?? []).map((item) =>
      typeof item === 'number' ? item : item.port,
    ),
  ].filter(Boolean);
  const pids = new Set();
  for (const port of ports) {
    const output = await run('lsof', [
      '-nP',
      '-a',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-t',
    ]);
    for (const value of output.split('\n'))
      if (/^\d+$/.test(value)) pids.add(Number(value));
  }
  const expected = {
    ...config,
    cwd: await canonical(config.cwd),
    executable: config.executable
      ? await canonical(config.executable)
      : undefined,
  };
  const result = [];
  for (const pid of pids) {
    const info = await inspectProcess(pid);
    if (info && belongsToService(info, expected))
      result.push({ pid, identity: info.identity });
  }
  return result;
}

async function inspectProcess(pid) {
  const identity = await processIdentity(pid);
  if (!identity || pid === process.pid) return null;
  const files = await run('lsof', [
    '-a',
    '-p',
    String(pid),
    '-d',
    'cwd,txt',
    '-Ffn',
  ]);
  let field;
  let cwd;
  let executable;
  for (const line of files.split('\n')) {
    if (line.startsWith('f')) field = line.slice(1);
    if (line.startsWith('n') && field === 'cwd') cwd = line.slice(1);
    if (line.startsWith('n') && field === 'txt' && !executable)
      executable = line.slice(1);
  }
  if (!cwd || !executable) return null;
  return {
    pid,
    identity,
    cwd: await canonical(cwd),
    executable: await canonical(executable),
  };
}

/** Walk only the listener's ancestors; never search globally for dev script names. */
export async function findServiceRoot(target, config) {
  if (config.executable) return target;
  const cwd = await canonical(config.cwd);
  let root = target;
  let pid = target.pid;
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const script = config.launcherScript;
  const scriptPattern = script
    ? new RegExp(
        `(?:^|\\s)(?:${escape(path.join(cwd, script))}|${escape(script)})(?:\\s|$)`,
      )
    : null;
  for (let depth = 0; depth < 16; depth++) {
    const parent = Number(await run('ps', ['-p', String(pid), '-o', 'ppid=']));
    if (parent <= 1 || parent === process.pid || !Number.isInteger(parent))
      break;
    const info = await inspectProcess(parent);
    if (
      !info ||
      !(info.cwd === cwd || info.cwd.startsWith(`${cwd}${path.sep}`))
    )
      break;
    if (
      belongsToService(info, { cwd }) &&
      (/pnpm(?:\.cjs|\.js)?\s+(?:run\s+)?dev(?:\s|$)/.test(info.identity) ||
        scriptPattern?.test(info.identity))
    ) {
      root = { pid: parent, identity: info.identity };
    }
    pid = parent;
  }
  return root;
}

/** Capture identity before signalling; never signal an unrelated process that reused a PID. */
export async function terminateTree(pid, identity = undefined) {
  const original = identity ?? (await processIdentity(pid));
  if (!original || pid <= 1 || pid === process.pid) return;
  const children = await run('pgrep', ['-P', String(pid)]);
  const descendants = await Promise.all(
    children
      .split('\n')
      .filter((value) => /^\d+$/.test(value))
      .map(async (value) => {
        const childPid = Number(value);
        return { pid: childPid, identity: await processIdentity(childPid) };
      }),
  );
  if ((await processIdentity(pid)) !== original) return;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already exited */
  }
  await Promise.all(
    descendants.map((child) => terminateTree(child.pid, child.identity)),
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  if ((await processIdentity(pid)) !== original) return;
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already exited */
  }
}
