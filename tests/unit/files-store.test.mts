import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { listDirectory } from '../../scripts/vite/files-store.ts';

describe('files-store', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'files-store-'));

    await mkdir(path.join(root, 'folder-a'));
    await mkdir(path.join(root, 'folder-b'));
    await mkdir(path.join(root, 'sub', 'folder-c'), { recursive: true });

    await writeFile(path.join(root, 'folder-a', 'one.mp4'), 'a');
    await writeFile(path.join(root, 'folder-a', 'two.mov'), 'b');
    await writeFile(path.join(root, 'folder-a', 'note.txt'), 'c');
    await writeFile(path.join(root, 'sub', 'folder-c', 'clip.mp4'), 'd');
    await writeFile(path.join(root, 'clip.webm'), 'e');
    await writeFile(path.join(root, 'poster.png'), 'f');
    await writeFile(path.join(root, '.hidden.mp4'), 'g');
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('列出直属文件与子文件夹（不限扩展名），文件夹按直属条目计数', async () => {
    const listing = await listDirectory(root);

    assert.equal(listing.path, root);
    assert.equal(listing.parent, path.dirname(root));
    assert.deepEqual(
      listing.folders.map((folder) => [folder.name, folder.itemCount]),
      [
        ['folder-a', 3],
        ['folder-b', 0],
        ['sub', 1],
      ],
    );
    assert.deepEqual(
      listing.files.map((file) => file.name),
      ['clip.webm', 'poster.png'],
    );
  });

  it('文件条目带大小与修改时间，文件大小按字节保留', async () => {
    const [file] = (await listDirectory(root)).files;

    assert.ok(file);
    assert.equal(file.size, 1);
    assert.match(file.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(file.path, path.join(root, 'clip.webm'));
  });

  it('子文件夹可以再打开一层', async () => {
    const [sub] = (await listDirectory(root)).folders.filter(
      (folder) => folder.name === 'sub',
    );

    assert.ok(sub);

    const nested = await listDirectory(sub.path);

    assert.deepEqual(nested.folders.map((folder) => folder.name), ['folder-c']);
    assert.deepEqual(nested.files, []);
  });

  it('相对路径被拒收，目录不存在时抛可读错误', async () => {
    await assert.rejects(() => listDirectory('relative/path'), /绝对路径/);
    await assert.rejects(
      () => listDirectory(path.join(root, 'no-such-dir')),
      /目录不存在/,
    );
  });
});
