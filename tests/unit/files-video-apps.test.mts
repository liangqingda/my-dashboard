import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  declaresVideoPlayback,
  isListableVideoApp,
} from '../../scripts/vite/files-video-apps.ts';

describe('files-video-apps', () => {
  it('声明了视频统一类型标识的应用算能播视频', () => {
    assert.equal(
      declaresVideoPlayback([
        { LSItemContentTypes: ['public.movie', 'public.mp3'] },
      ]),
      true,
    );
    assert.equal(
      declaresVideoPlayback([{ LSItemContentTypes: ['public.mpeg-4'] }]),
      true,
    );
  });

  it('只写扩展名也能认出来，大小写与点号不敏感', () => {
    assert.equal(
      declaresVideoPlayback([{ CFBundleTypeExtensions: ['MP4', 'm3u8'] }]),
      true,
    );
    assert.equal(
      declaresVideoPlayback([{ CFBundleTypeExtensions: ['.mkv'] }]),
      true,
    );
  });

  it('纯音频、纯文本、空声明与脏结构都不算', () => {
    assert.equal(
      declaresVideoPlayback([{ LSItemContentTypes: ['public.mp3'] }]),
      false,
    );
    assert.equal(
      declaresVideoPlayback([{ CFBundleTypeExtensions: ['txt', 'md'] }]),
      false,
    );
    assert.equal(declaresVideoPlayback([]), false);
    assert.equal(declaresVideoPlayback(null), false);
    assert.equal(declaresVideoPlayback('public.movie'), false);
    assert.equal(declaresVideoPlayback([null, 42, {}]), false);
  });
});

describe('isListableVideoApp', () => {
  it('网盘 / 阅读 / 聊天 / 音乐 / QuickTime 这类不列出', () => {
    for (const name of [
      'BaiduNetdisk_mac',
      'Books',
      'Messages',
      'Music',
      'QuickTime Player',
    ]) {
      assert.equal(isListableVideoApp(name), false);
    }
  });

  it('播放器照常列出，大小写不同不算命中', () => {
    for (const name of ['IINA', 'QQLive', 'TV', 'QuickTime Player Pro']) {
      assert.equal(isListableVideoApp(name), true);
    }
  });
});
