import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAgentAbsent } from '../../scripts/vite/files-wallpaper.ts';

describe('files-wallpaper 的桌面进程判断', () => {
  it('桌面进程没在跑不算失败，下次启动会读新配置', () => {
    assert.equal(
      isAgentAbsent({
        message: 'Command failed: killall WallpaperAgent',
        stderr: 'No matching processes belonging to you were found',
      }),
      true,
    );
  });

  it('真正的失败（权限 / 其它原因）照常上报', () => {
    assert.equal(isAgentAbsent({ message: 'Operation not permitted' }), false);
    assert.equal(isAgentAbsent(null), false);
  });
});
