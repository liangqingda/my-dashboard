/**
 * 播放器控制栏的契约：只展示进度与声音状态，动作全部回调给播放器。
 */

import type { FreeVideoNav } from '../types';

/** 进度条悬停预览的落点：浮层横向位置与这一处的时间 */
export type SeekPreviewState = {
  /** 浮层中心相对进度条容器左沿的像素位置（已夹在容器内） */
  left: number;
  /** 这一处对应的时间（秒）：帧图就按这个时间去抽，时间标签显示的也是它 */
  time: number;
};

/** `seekPreviewAt` 的入参 */
export type SeekPreviewParams = {
  /** 指针横坐标（视口坐标） */
  clientX: number;
  /** 进度条容器左沿（视口坐标）：它也就是 Slider 的 root，时间与浮层都按它算 */
  containerLeft: number;
  /** 进度条容器宽度（含 Slider root 的内边距，与 Mantine 取值口径一致） */
  containerWidth: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 预览框宽度（CSS px）：贴边夹取要用 */
  previewWidth: number;
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
  /** 请求某一时刻的帧：已缓存同步回调，否则排队现抽；抽到后回调拿到图 */
  requestFrame: (time: number, onFrame: (url: string) => void) => void;
  /** 抽帧是否可用（探针已拿到元数据）：false 时不显示预览、进度条回落数字浮标 */
  previewReady: boolean;
  /** 预览框宽（CSS px）：跟着视频画面大小走 */
  previewWidth: number;
  /** 预览框高（CSS px） */
  previewHeight: number;
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
