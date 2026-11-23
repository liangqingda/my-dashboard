/**
 * 外部打开侧的入参校验：只收绝对路径、必须存在、必须是常规文件。
 * 真正调 `open` 的那一步不在这里测——它会把播放器拉起来，也不该依赖本机装了什么。
 */

import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { resolveOpenableFile } from '../../scripts/vite/files-open.ts';

test('外部打开：绝对路径的常规文件通过，相对路径 / 缺失 / 目录都拒收', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'files-open-'));
  const file = path.join(root, 'clip.mp4');
  const folder = path.join(root, 'sub');

  await writeFile(file, 'video');
  await mkdir(folder);

  assert.equal(await resolveOpenableFile(file), file);
  assert.equal(await resolveOpenableFile(` ${file} `), file);

  await assert.rejects(resolveOpenableFile('clip.mp4'), /绝对路径/);
  await assert.rejects(resolveOpenableFile('   '), /缺少文件路径/);
  await assert.rejects(
    resolveOpenableFile(path.join(root, 'missing.mp4')),
    /不存在/,
  );
  await assert.rejects(resolveOpenableFile(folder), /不是常规文件/);
});
