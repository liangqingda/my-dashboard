/**
 * 几何动画的公共算式：把「A 矩形缩到 B 矩形」拆成中心位移 + 等比缩放。
 *
 * 程序坞窗口从图标长大 / 缩回图标，与弹窗从打开点长大 / 缩回打开点用的是同一套。
 * 两个地方各写一份，迟早会在「取较小的一维」「中心对齐」这些细节上分叉。
 */

/** 动画用的矩形：`DOMRect` 的超集，只取动画真正用到的四个值 */
export type MotionRect = {
  /** 底边到视口顶部的距离 */
  height: number;
  /** 左边到视口左侧的距离 */
  left: number;
  /** 顶边到视口顶部的距离 */
  top: number;
  /** 宽度 */
  width: number;
};

/** 系统是否要求减少动态效果：是则所有几何动画跳过，只留即时显隐 */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const centerOf = (rect: MotionRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

/**
 * 从 `from` 缩到 `to` 需要的中心位移与等比缩放。
 *
 * 缩放取较小的一维：宽高比不同的两块之间按单维算，另一维会撑出目标框。
 * 调用方按需把 `scale` 夹到自己的上下限（弹窗有最小缩放，窗口没有）。
 */
export const shiftBetweenRects = (
  from: MotionRect,
  to: MotionRect,
): { dx: number; dy: number; scale: number } => {
  const fromCenter = centerOf(from);
  const toCenter = centerOf(to);

  return {
    dx: toCenter.x - fromCenter.x,
    dy: toCenter.y - fromCenter.y,
    scale: Math.min(to.width / from.width, to.height / from.height),
  };
};
