import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  captureBaseName,
  captureDirectory,
  decodePngDataUrl,
  parseByteRange,
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

  it('截图文件名取本地时间的年月日与时分秒', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);

    assert.equal(captureBaseName(date), '2026-01-02 03:04:05');
  });

  it('截图目录：缺省桌面，自定义绝对路径与 ~ 展开', () => {
    const desktop = join(homedir(), 'Desktop');

    assert.equal(captureDirectory(), desktop);
    assert.equal(captureDirectory(''), desktop);
    assert.equal(captureDirectory('   '), desktop);
    assert.equal(captureDirectory('~'), homedir());
    assert.equal(captureDirectory('~/Pictures/shots'), join(homedir(), 'Pictures/shots'));
    assert.equal(captureDirectory('/tmp/shots'), '/tmp/shots');
  });

  it('截图只接受 PNG data URL', () => {
    const buffer = decodePngDataUrl(`data:image/png;base64,${Buffer.from('png').toString('base64')}`);

    assert.equal(buffer.toString(), 'png');

    for (const bad of ['', 'data:image/jpeg;base64,AAAA', 'data:image/png;base64,']) {
      assert.throws(() => decodePngDataUrl(bad), /截图/);
    }
  });
});
