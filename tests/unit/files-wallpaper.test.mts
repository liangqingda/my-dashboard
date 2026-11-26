import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WALLPAPER_SCRIPT, wallpaperFailure } from '../../scripts/vite/files-wallpaper.ts';

describe('files-wallpaper 的错误归类与脚本', () => {
  it('自动化未授权时报「去哪勾选」，不是原始英文', () => {
    const error = {
      message: 'Command failed: osascript -e …',
      stderr:
        'execution error: Not authorized to send Apple events to System Events. (-1743)',
    };
    const mapped = wallpaperFailure(error) as Error & { code?: string };

    assert.equal(mapped.code, 'EACCES');
    assert.match(mapped.message, /隐私与安全性/);
    assert.match(mapped.message, /系统事件/);
  });

  it('System Events 没在运行时单独给一句，稍后重试', () => {
    const mapped = wallpaperFailure({
      message: 'execution error: System Events is not running. (-600)',
    }) as Error & { code?: string };

    assert.equal(mapped.code, 'EAGAIN');
  });

  it('认不出的失败保留原始输出并加前缀', () => {
    const mapped = wallpaperFailure({
      message: 'execution error: 系统事件发生错误 (-1728)',
    }) as Error & { code?: string };

    assert.equal(mapped.code, 'EIO');
    assert.match(mapped.message, /^更换桌面墙纸失败：/);
    assert.match(mapped.message, /-1728/);
  });

  it('脚本从 argv 取路径并铺到所有桌面', () => {
    assert.match(WALLPAPER_SCRIPT, /on run argv/);
    assert.match(WALLPAPER_SCRIPT, /POSIX file \(item 1 of argv\)/);
    assert.match(WALLPAPER_SCRIPT, /picture of every desktop/);
  });
});
