/**
 * 播放器的契约：只负责把给定地址播出来；与预览容器（弹窗、页面）互不依赖。
 */

import type { RefObject } from 'react';

/**
 * 控制栏里的两颗箭头：动作与文案都由调用方给——「翻篇」与「快进 / 后退」
 * 是同一对箭头（视频预览里跟着方向键去向的设置切换），播放器不判断语义。
 * 一端到头时传 `null`，那一侧的箭头置灰。
 */
export type FreeVideoNav = {
  /** 左边那颗箭头的动作；`null` 表示到头 */
  onPrevious: (() => void) | null;
  /** 右边那颗箭头的动作；`null` 表示到头 */
  onNext: (() => void) | null;
  /** 左边箭头的文案（aria-label 与 tip 同句），默认「上一个视频」 */
  previousLabel?: string;
  /** 右边箭头的文案，默认「下一个视频」 */
  nextLabel?: string;
};

/** 悬停帧快照：有悬停预览时给一张 PNG data URL（尽力按视频原始尺寸），否则 `null` */
export type HoverFrameGrabber = () => Promise<string | null>;

/** 播放器入参 */
export type FreeVideoProps = {
  /** 视频地址 */
  src: string;
  /** 视频元素引用：外部要取当前帧、从键盘驱动播放时传；与组件内部 ref 合并 */
  videoRef?: RefObject<HTMLVideoElement | null>;
  /** 翻篇：给了就画在控制栏里、播放键两侧；不传则控制栏没有这两颗箭头 */
  nav?: FreeVideoNav;
  /**
   * 进度条悬停预览的帧图大小：占视频画面宽度的比例（0.3–0.9），不传用 60%。
   * 越界值在这里夹回区间，调用方可以放心传。
   */
  previewScale?: number;
  /**
   * 交出「取此刻悬停预览那一帧」的函数：截图时优先用它，拿到的是全分辨率原图，
   * 不是浮层里那张缩小过的缩略帧。悬停帧收起时回调 `null`，调用方自己退回当前播放帧。
   */
  onHoverFrameGrabberReady?: (grabber: HoverFrameGrabber | null) => void;
  /** 附加 class，只用来补外部布局 */
  className?: string;
};
