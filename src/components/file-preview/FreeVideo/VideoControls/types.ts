/**
 * 播放器控制栏的契约：只展示进度与声音状态，动作全部回调给播放器。
 */

import type { FreeVideoNav } from '../types';

/** 控制栏入参 */
export type VideoControlsProps = {
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 视频总时长（秒）；还没解出元数据时为 0 */
  duration: number;
  /** 视频是否已解析完成（loading / error 时控制栏禁用） */
  enabled: boolean;
  /** 是否静音 */
  muted: boolean;
  /** 是否正在播放 */
  playing: boolean;
  /** 翻篇：给了就画在播放键两侧，到头的一侧置灰；不传则没有这两颗箭头 */
  nav?: FreeVideoNav;
  /** 播放 / 暂停 */
  onTogglePlay: () => void;
  /** 静音 / 取消静音 */
  onToggleMute: () => void;
  /** 拖到某一秒 */
  onSeek: (seconds: number) => void;
  /** 调整音量（0–1） */
  onVolumeChange: (volume: number) => void;
  /** 当前音量（0–1） */
  volume: number;
};
