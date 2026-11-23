/**
 * 播放器的契约：只负责把给定地址播出来；与预览容器（弹窗、页面）互不依赖。
 */

import type { RefObject } from 'react';

/** 翻篇：一端到头时传 `null`，那一侧的箭头置灰 */
export type FreeVideoNav = {
  /** 上一个；`null` 表示到头 */
  onPrevious: (() => void) | null;
  /** 下一个；`null` 表示到头 */
  onNext: (() => void) | null;
};

/** 播放器入参 */
export type FreeVideoProps = {
  /** 视频地址 */
  src: string;
  /** 视频元素引用：外部要取当前帧、从键盘驱动播放时传；与组件内部 ref 合并 */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** 翻篇：给了就画在控制栏里、播放键两侧；不传则控制栏没有这两颗箭头 */
  nav?: FreeVideoNav;
  /** 附加 class，只用来补外部布局 */
  className?: string;
};
