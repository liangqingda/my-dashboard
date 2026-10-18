import { fileURLToPath } from 'node:url';
import {
  findServiceProcesses,
  findServiceRoot,
  terminateTree,
} from '../agent/processes.mjs';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const kind = process.argv[2];
if (!['dev', 'agent'].includes(kind))
  throw new Error('Usage: node scripts/stop-local.mjs dev|agent');
const processes = await findServiceProcesses({
  cwd: root,
  port: kind === 'dev' ? 3000 : Number(process.env.AGENT_PORT || 8787),
});
for (const target of processes) {
  if (kind === 'agent' && !target.identity.includes('agent/server.mjs'))
    continue;
  const owned =
    kind === 'dev' ? await findServiceRoot(target, { cwd: root }) : target;
  await terminateTree(owned.pid, owned.identity);
}
console.log(`${kind} stop completed`);
