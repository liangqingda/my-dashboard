import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, appendFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { waitForStartup } from './wait-for-startup.mjs';

for (const scenario of ['ready', 'failure', 'exit', 'timeout', 'ignored']) {
  test(`startup: ${scenario}`, async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'startup-test-'));
    const logPath = path.join(dir, 'service.log');
    const old = 'ready\n';
    await writeFile(logPath, old);
    const child = Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: null,
    });
    const result = waitForStartup({
      child,
      logPath,
      logOffset: Buffer.byteLength(old),
      timeoutMs: scenario === 'timeout' ? 30 : 1000,
      config: {
        successMarkers: ['ready'],
        failMarkers: ['error'],
        failIgnorePatterns: ['client error'],
      },
    });
    const checked =
      scenario === 'ready' || scenario === 'ignored'
        ? result
        : assert.rejects(
            result,
            scenario === 'failure'
              ? /服务启动失败/
              : scenario === 'exit'
                ? /就绪前退出/
                : /启动超时/,
          );
    try {
      if (scenario === 'ready') await appendFile(logPath, 'ready\n');
      if (scenario === 'failure') await appendFile(logPath, 'error\n');
      if (scenario === 'ignored')
        await appendFile(logPath, 'client error\nready\n');
      if (scenario === 'exit') child.emit('exit', 1, null);
      await checked;
      assert.equal(child.listenerCount('exit'), 0);
      assert.equal(child.listenerCount('error'), 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
