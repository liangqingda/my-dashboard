/**
 * 播放器的契约：只负责把给定地址播出来，视频元素引用交给弹窗复用于截图。
 */

import type { RefObject } from 'react';

/** 播放器入参 */
export type VideoPlayerProps = {
  /** 视频地址 */
  src: string;
  /** 视频元素引用：截图取帧、空格播放都读它 */
  videoRef: RefObject<HTMLVideoElement | null>;
};
