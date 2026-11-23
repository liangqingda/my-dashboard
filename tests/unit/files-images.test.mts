import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { openImageFile } from '../../scripts/vite/files-images.ts';

describe('files-images 的路径校验与 MIME', () => {
  let root: string;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'files-images-'));

    await writeFile(join(root, 'poster.PNG'), 'f');
    await writeFile(join(root, 'photo.jpeg'), 'f');
    await writeFile(join(root, 'clip.mp4'), 'f');
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('图片按扩展名给 MIME，大小写不敏感', async () => {
    const png = await openImageFile(join(root, 'poster.PNG'));

    assert.equal(png.mime, 'image/png');
    assert.equal(png.size, 1);
    assert.equal(png.path, join(root, 'poster.PNG'));

    const jpeg = await openImageFile(join(root, 'photo.jpeg'));

    assert.equal(jpeg.mime, 'image/jpeg');
  });

  it('非图片类型、相对路径与缺失文件都被拒收', async () => {
    await assert.rejects(
      () => openImageFile(join(root, 'clip.mp4')),
      /只提供图片文件/,
    );
    await assert.rejects(() => openImageFile('poster.png'), /绝对路径/);
    await assert.rejects(
      () => openImageFile(join(root, 'nope.png')),
      /图片不存在/,
    );
  });
});
