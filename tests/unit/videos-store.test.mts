import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { listDirectory } from '../../scripts/vite/videos-store.ts';

describe('videos-store', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'videos-store-'));

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

  it('只列出直属视频与子文件夹，文件夹按直属视频计数', async () => {
    const listing = await listDirectory(root);

    assert.equal(listing.path, root);
    assert.equal(listing.parent, path.dirname(root));
    assert.deepEqual(
      listing.folders.map((folder) => [folder.name, folder.videoCount]),
      [
        ['folder-a', 2],
        ['folder-b', 0],
        ['sub', 0],
      ],
    );
    assert.deepEqual(listing.videos.map((video) => video.name), ['clip.webm']);
  });

  it('视频条目带大小与修改时间，文件大小按字节保留', async () => {
    const [video] = (await listDirectory(root)).videos;

    assert.ok(video);
    assert.equal(video.size, 1);
    assert.match(video.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(video.path, path.join(root, 'clip.webm'));
  });

  it('子文件夹可以再打开一层', async () => {
    const [sub] = (await listDirectory(root)).folders.filter(
      (folder) => folder.name === 'sub',
    );

    assert.ok(sub);

    const nested = await listDirectory(sub.path);

    assert.deepEqual(nested.folders.map((folder) => folder.name), ['folder-c']);
    assert.deepEqual(nested.videos, []);
  });

  it('相对路径被拒收，目录不存在时抛可读错误', async () => {
    await assert.rejects(() => listDirectory('relative/path'), /绝对路径/);
    await assert.rejects(
      () => listDirectory(path.join(root, 'no-such-dir')),
      /目录不存在/,
    );
  });
});
