/**
 * 播放器控制栏的契约：只展示进度与声音状态，动作全部回调给播放器。
 */

import type { VideoFrame } from '../hooks/use-video-frames';
import type { FreeVideoNav } from '../types';

/** 进度条悬停预览的落点：帧下标、浮层横向位置与时间 */
export type SeekPreviewState = {
  /** 帧图数组里的下标（已夹在数组范围内） */
  index: number;
  /** 浮层中心相对进度条容器左沿的像素位置（已夹在容器内） */
  left: number;
  /** 这一处对应的时间（秒） */
  time: number;
};

/** `seekPreviewAt` 的入参 */
export type SeekPreviewParams = {
  /** 指针横坐标（视口坐标） */
  clientX: number;
  /** 进度条容器左沿（视口坐标） */
  containerLeft: number;
  /** 进度条容器宽度 */
  containerWidth: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 已备好的帧数 */
  frameCount: number;
  /** 一帧覆盖的时长（秒） */
  frameSpan: number;
};

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
  /** 进度条悬停预览的帧图：定长数组，抽不到的格子是 null；未备好传 null（回落到数字浮标） */
  frames?: VideoFrame[] | null;
  /** 一帧覆盖的时长（秒）：配合 `frames` 换算悬停位置对应哪一帧 */
  frameSpan?: number;
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
