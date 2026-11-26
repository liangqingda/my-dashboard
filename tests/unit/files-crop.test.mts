import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { CROP_DIR_SUFFIX, cropImageFile } from '../../scripts/vite/files-crop.ts';

/** 把一个字符串包成 PNG 的 data URL：测试只关心字节落到了哪，不解码图片 */
const pngDataUrl = (value: string): string =>
  `data:image/png;base64,${Buffer.from(value).toString('base64')}`;

/** 同上，JPEG 版本：用来校验扩展名与编码格式必须一致 */
const jpegDataUrl = (value: string): string =>
  `data:image/jpeg;base64,${Buffer.from(value).toString('base64')}`;

describe('files-crop 的裁剪落盘', () => {
  let root = '';
  let dir = '';

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'files-crop-'));
    dir = join(root, '图片');
    await mkdir(dir, { recursive: true });
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('replace：原地覆盖源文件，文件名与路径都不变', async () => {
    const source = join(dir, 'photo.png');
    await writeFile(source, '原图');

    const receipt = await cropImageFile(source, pngDataUrl('裁剪后'), 'replace');

    assert.deepEqual(receipt, {
      dir,
      mode: 'replace',
      name: 'photo.png',
      path: source,
    });
    assert.equal(await readFile(source, 'utf8'), '裁剪后');
  });

  it('copy：另存到「- 裁剪」目录，按已有编号的 max + 1 递增', async () => {
    const source = join(dir, 'cat.png');
    const target = join(dir, `cat${CROP_DIR_SUFFIX}`);
    await writeFile(source, '原图');
    await mkdir(target, { recursive: true });
    // 先摆一张 3 号：编号应从 4 接着走，而不是从 1 重来
    await writeFile(join(target, 'cat - 3.png'), '旧裁剪');

    const first = await cropImageFile(source, pngDataUrl('第一张'), 'copy');

    assert.equal(first.mode, 'copy');
    assert.equal(first.name, 'cat - 4.png');
    assert.equal(first.dir, target);
    assert.equal(await readFile(join(target, 'cat - 4.png'), 'utf8'), '第一张');

    const second = await cropImageFile(source, pngDataUrl('第二张'), 'copy');

    assert.equal(second.name, 'cat - 5.png');
    assert.equal(await readFile(join(target, 'cat - 5.png'), 'utf8'), '第二张');
  });

  it('copy 保留源扩展名：.jpeg 的裁剪结果仍是 .jpeg', async () => {
    const source = join(dir, 'view.jpeg');
    await writeFile(source, '原图');

    const receipt = await cropImageFile(source, jpegDataUrl('裁剪后'), 'copy');

    assert.equal(receipt.name, 'view - 1.jpeg');
    assert.equal(receipt.dir, join(dir, `view${CROP_DIR_SUFFIX}`));
  });

  it('不收 GIF / HEIC 这类换格式就会名不副实的图片', async () => {
    const source = join(dir, 'loop.gif');
    await writeFile(source, 'gif');

    await assert.rejects(
      () => cropImageFile(source, pngDataUrl('x'), 'replace'),
      /不支持裁剪保存/,
    );
  });

  it('编码格式必须与源扩展名一致', async () => {
    const source = join(dir, 'shot.png');
    await writeFile(source, '原图');

    await assert.rejects(
      () => cropImageFile(source, jpegDataUrl('x'), 'copy'),
      /格式与源文件不一致/,
    );
  });

  it('拒绝脏入参：相对路径、非图片、坏 data URL、不认识的保存方式', async () => {
    const source = join(dir, 'note.png');
    await writeFile(source, '原图');

    await assert.rejects(
      () => cropImageFile('note.png', pngDataUrl('x'), 'replace'),
      /绝对路径/,
    );
    await assert.rejects(
      () => cropImageFile(join(dir, 'note.txt'), pngDataUrl('x'), 'replace'),
      /只提供图片文件/,
    );
    await assert.rejects(
      () => cropImageFile(source, 'data:image/png;base64,', 'replace'),
      /裁剪数据不是有效的图片/,
    );
    await assert.rejects(
      () => cropImageFile(source, pngDataUrl('x'), 'overwrite'),
      /不认识的裁剪保存方式/,
    );
  });

  it('源文件不存在时按 ENOENT 报错，不落任何文件', async () => {
    const source = join(dir, 'missing.png');

    await assert.rejects(() => cropImageFile(source, pngDataUrl('x'), 'replace'), {
      code: 'ENOENT',
    });
    await assert.rejects(
      () => readFile(join(dir, `missing${CROP_DIR_SUFFIX}`, 'missing - 1.png')),
      { code: 'ENOENT' },
    );
  });
});
