/**
 * 播放器的契约：只负责把给定地址播出来；与预览容器（弹窗、页面）互不依赖。
 */

import type { RefObject } from 'react';

/** 播放器入参 */
export type FreeVideoProps = {
  /** 视频地址 */
  src: string;
  /** 视频元素引用：外部要取当前帧、从键盘驱动播放时传；与组件内部 ref 合并 */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** 附加 class，只用来补外部布局 */
  className?: string;
};
