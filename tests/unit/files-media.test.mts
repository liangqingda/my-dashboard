import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  captureBaseName,
  decodePngDataUrl,
  exportDirectory,
  parseByteRange,
  videoEtag,
} from '../../scripts/vite/files-media.ts';

describe('files-media 的纯函数', () => {
  it('解析 Range：首尾、开区间与后缀三种写法', () => {
    assert.deepEqual(parseByteRange('bytes=0-99', 1000), { end: 99, start: 0 });
    assert.deepEqual(parseByteRange('bytes=900-', 1000), {
      end: 999,
      start: 900,
    });
    assert.deepEqual(parseByteRange('bytes=-100', 1000), {
      end: 999,
      start: 900,
    });
    // 结束值超出文件末尾时夹回最后一字节
    assert.deepEqual(parseByteRange('bytes=0-5000', 1000), {
      end: 999,
      start: 0,
    });
    // 后缀比文件还长时从 0 开始
    assert.deepEqual(parseByteRange('bytes=-5000', 1000), {
      end: 999,
      start: 0,
    });
  });

  it('Range 无效时按整份响应处理，不抛错', () => {
    for (const header of [
      undefined,
      '',
      'bytes=',
      'items=0-1',
      'bytes=1000-',
      'bytes=500-100',
      'bytes=a-b',
    ]) {
      assert.equal(parseByteRange(header, 1000), null);
    }

    assert.equal(parseByteRange('bytes=0-1', 0), null);
  });

  it('ETag 由体积与修改时间决定：任一变化都会换一个值', () => {
    const base = { mime: 'video/mp4', path: '/tmp/a.mp4', size: 10, mtimeMs: 1700 };

    assert.equal(videoEtag(base), 'W/"10-1700"');
    assert.notEqual(
      videoEtag({ ...base, size: 11 }),
      videoEtag(base),
    );
    assert.notEqual(
      videoEtag({ ...base, mtimeMs: 1800 }),
      videoEtag(base),
    );
  });

  it('截图文件名取本地时间的年月日与时分秒', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);

    assert.equal(captureBaseName(date), '2026-01-02 03:04:05');
  });

  it('导出目录：缺省桌面，自定义绝对路径与 ~ 展开', () => {
    const desktop = join(homedir(), 'Desktop');

    assert.equal(exportDirectory(), desktop);
    assert.equal(exportDirectory(''), desktop);
    assert.equal(exportDirectory('   '), desktop);
    assert.equal(exportDirectory('~'), homedir());
    assert.equal(exportDirectory('~/Pictures/shots'), join(homedir(), 'Pictures/shots'));
    assert.equal(exportDirectory('/tmp/shots'), '/tmp/shots');
  });

  it('截图只接受 PNG data URL', () => {
    const buffer = decodePngDataUrl(`data:image/png;base64,${Buffer.from('png').toString('base64')}`);

    assert.equal(buffer.toString(), 'png');

    for (const bad of ['', 'data:image/jpeg;base64,AAAA', 'data:image/png;base64,']) {
      assert.throws(() => decodePngDataUrl(bad), /截图/);
    }
  });
});
