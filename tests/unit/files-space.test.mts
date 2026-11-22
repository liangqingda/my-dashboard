import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  isExternalMount,
  parseDfOutput,
  readDirSpace,
} from '../../scripts/vite/files-space.ts';

describe('files-space', () => {
  it('解析 df -kP：跳过表头，可用块数按 1024 字节换算，取到挂载点', () => {
    const stdout = [
      'Filesystem     1024-blocks      Used Available Capacity  Mounted on',
      '/dev/disk3s1s1   239362496  13336984   9052564    60%    /',
    ].join('\n');

    assert.deepEqual(parseDfOutput(stdout), {
      freeBytes: 9052564 * 1024,
      mountPoint: '/',
    });
  });

  it('挂载点里带空格时整段保留；认不出的输出返回 null', () => {
    const stdout = [
      'Filesystem 1024-blocks Used Available Capacity Mounted on',
      '/dev/disk4s1 976490576 100 976390576 1% /Volumes/My Passport',
    ].join('\n');

    assert.deepEqual(parseDfOutput(stdout), {
      freeBytes: 976390576 * 1024,
      mountPoint: '/Volumes/My Passport',
    });
    assert.equal(parseDfOutput(''), null);
    assert.equal(parseDfOutput('garbage line'), null);
  });

  it('外接卷判定：在 /Volumes 下且不是启动卷自己的挂载点', () => {
    assert.equal(isExternalMount('/Volumes/T7', '/'), true);
    assert.equal(isExternalMount('/', '/'), false);
    assert.equal(isExternalMount('/System/Volumes/Data', '/'), false);
    assert.equal(isExternalMount('/Volumes/Boot', '/Volumes/Boot'), false);
  });

  it('读启动卷上的目录：system 有可用字节、没有名字，external 为 null', async () => {
    const space = await readDirSpace(tmpdir());

    assert.ok(space);
    assert.ok(space.system.freeBytes > 0);
    assert.equal(space.system.mountPoint, '/');
    assert.equal(space.system.name, null);
    assert.equal(space.external, null);
  });
});
