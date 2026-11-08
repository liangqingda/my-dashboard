import { fileURLToPath } from 'node:url';
import {
  findServiceProcesses,
  findServiceRoot,
  terminateTree,
} from '../agent/processes.mjs';

/**
 * 命令行侧的停止入口，对应 pnpm start 起的两个进程：
 * dev（3000，需要沿祖先链找到项目根）、agent（8787）。
 * 其余服务由 agent 的 HTTP 接口启停，不走这里。
 */
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const kind = process.argv[2];
const KINDS = ['dev', 'agent', 'all'];
if (!KINDS.includes(kind))
  throw new Error('Usage: node scripts/stop-local.mjs dev|agent|all');

const stopTarget = async (target) => {
  const owned =
    target.kind === 'dev'
      ? await findServiceRoot(target.process, { cwd: root })
      : target.process;
  await terminateTree(owned.pid, owned.identity);
};

const targets = [];
if (kind === 'dev' || kind === 'all') {
  for (const listener of await findServiceProcesses({ cwd: root, port: 3000 }))
    targets.push({ kind: 'dev', process: listener });
}
if (kind === 'agent' || kind === 'all') {
  const port = Number(process.env.AGENT_PORT || 8787);
  for (const listener of await findServiceProcesses({ cwd: root, port }))
    if (listener.identity.includes('agent/server.mjs'))
      targets.push({ kind: 'agent', process: listener });
}

for (const target of targets) await stopTarget(target);
console.log(`${kind} stop completed`);
