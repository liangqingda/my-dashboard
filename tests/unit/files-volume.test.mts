import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  isPathWithin,
  openTrackedStream,
  countStreamsUnder,
  releaseStreamsUnder,
} from '../../scripts/vite/files-handles.ts';
import {
  parseLsofPids,
  parseProcessRows,
  processBaseName,
  unkillableReason,
} from '../../scripts/vite/files-volume.ts';

describe('files-volume 的纯函数', () => {
  it('lsof 分段输出里取 PID：同一进程多行只算一次，丢掉 1 号进程', () => {
    const output = [
      'p73209',
      'cnode',
      'n/Volumes/盘/movies/a.mp4',
      'p1',
      'claunchd',
      'p982',
      'cFinder',
      'n/Volumes/盘/notes.md',
      'p73209',
    ].join('\n');

    assert.deepEqual(parseLsofPids(output), [73209, 982]);
    assert.deepEqual(parseLsofPids(''), []);
  });

  it('ps 批量输出解析成 PID / 用户 / 进程名，认不出的行跳过', () => {
    const output = [
      '  982 lqd /Applications/IINA.app/Contents/MacOS/iina-cli',
      '  120 _windowserver /System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer',
      'garbage line',
    ].join('\n');

    assert.deepEqual(parseProcessRows(output), [
      {
        name: '/Applications/IINA.app/Contents/MacOS/iina-cli',
        pid: 982,
        user: 'lqd',
      },
      {
        name: '/System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer',
        pid: 120,
        user: '_windowserver',
      },
    ]);
  });

  it('进程名取基底并小写，`.app` 后缀剥掉', () => {
    assert.equal(processBaseName('/Applications/IINA.app'), 'iina');
    assert.equal(processBaseName('/usr/libexec/mds_stores'), 'mds_stores');
  });

  it('能不能结束：系统进程、别的用户都不动，同用户的普通进程可以', () => {
    assert.equal(unkillableReason('/usr/sbin/mds', 'lqd', 'lqd'), '系统进程，不做自动结束');
    assert.equal(
      unkillableReason('/Applications/IINA.app', '_windowserver', 'lqd'),
      '由用户 _windowserver 启动，需要你自己关掉',
    );
    assert.equal(unkillableReason('/Applications/IINA.app', 'lqd', 'lqd'), null);
  });
});

describe('读流登记与释放', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'files-handles-'));
    await writeFile(path.join(root, 'a.mp4'), 'video-bytes');
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('路径归属按分隔符比，不把 `/Volumes/盘2` 算进 `/Volumes/盘`', () => {
    assert.equal(isPathWithin('/Volumes/盘/a.mp4', '/Volumes/盘'), true);
    assert.equal(isPathWithin('/Volumes/盘', '/Volumes/盘'), true);
    assert.equal(isPathWithin('/Volumes/盘2/a.mp4', '/Volumes/盘'), false);
  });

  it('打开即登记、销毁即销号；释放只动这一卷下的流', async () => {
    const filePath = path.join(root, 'a.mp4');
    const stream = openTrackedStream(filePath);

    assert.equal(countStreamsUnder(root), 1);
    assert.equal(countStreamsUnder(path.join(root, 'nowhere')), 0, '子目录不在被登记的文件之下，不该计数');

    const released = await releaseStreamsUnder(root);

    assert.equal(released, 1);
    assert.equal(stream.destroyed, true);
    // 等 'close' 回调跑完再断言登记表已清空
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countStreamsUnder(root), 0);
  });

  it('别的卷下的流不会被误伤', async () => {
    const filePath = path.join(root, 'a.mp4');
    const stream = openTrackedStream(filePath);

    const released = await releaseStreamsUnder(path.join(root, 'nowhere'));

    assert.equal(released, 0);
    assert.equal(stream.destroyed, false);

    stream.destroy();
  });
});
