import assert from 'node:assert/strict';
import test from 'node:test';
import { belongsToService } from './processes.mjs';

test('project processes require project cwd and a Node executable', () => {
  const config = { cwd: '/projects/study-lab' };
  assert.equal(
    belongsToService(
      { cwd: '/projects/study-lab/apps/web', executable: '/bin/node' },
      config,
    ),
    true,
  );
  assert.equal(
    belongsToService(
      { cwd: '/projects/other', executable: '/bin/node' },
      config,
    ),
    false,
  );
  assert.equal(
    belongsToService(
      { cwd: '/projects/study-lab-copy', executable: '/bin/node' },
      config,
    ),
    false,
  );
  assert.equal(
    belongsToService(
      { cwd: '/projects/study-lab', executable: '/bin/zsh' },
      config,
    ),
    false,
  );
});
test('managed databases require the exact executable', () => {
  const config = {
    cwd: '/projects/redis',
    executable: '/projects/redis/bin/redis-server',
  };
  assert.equal(
    belongsToService({ cwd: '/', executable: config.executable }, config),
    true,
  );
  assert.equal(
    belongsToService(
      { cwd: '/projects/redis', executable: '/other/bin/redis-server' },
      config,
    ),
    false,
  );
});
