import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, open, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readTail, rotateLog, normalizeLines } from './logs.mjs';

test('tail reads final lines within a byte budget and validates line counts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dashboard-logs-'));
  try {
    const file = path.join(dir, 'service.log');
    await writeFile(
      file,
      'large historical line\n'.repeat(100000) + '你好\nlast\n',
    );
    assert.equal(await readTail(file, 2, 100), '你好\nlast');
    assert.equal(await readTail(path.join(dir, 'missing'), 2), '');
    assert.equal(normalizeLines(-2), 60);
    assert.equal(normalizeLines('NaN'), 60);
    assert.equal(normalizeLines('100000'), 1000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('rotation retains archives and preserves a running writer descriptor', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dashboard-rotate-'));
  let writer;
  try {
    const file = path.join(dir, 'service.log');
    await writeFile(file, 'old-output');
    writer = await open(file, 'a');
    assert.equal(await rotateLog(file, 5, 2), true);
    await writer.write('new-output');
    assert.equal(await readFile(file, 'utf8'), 'new-output');
    assert.equal(await readFile(`${file}.1`, 'utf8'), 'old-output');
    await rotateLog(file, 5, 2);
    assert.equal(await readFile(`${file}.2`, 'utf8'), 'old-output');
  } finally {
    await writer?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
