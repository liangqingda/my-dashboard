/**
 * 程序坞窗口的遮罩层：收放时的淡入 / 淡出。
 *
 * 框体是「神奇效果」，背景不能硬切：开窗时遮罩从透明长到原样，收窗时反过来，
 * 两者用同一段时长，才不会出现「窗口在飞、背景先没了」。
 */

import { prefersReducedMotion } from '@/utils/motion-geometry';

/** 根节点里的遮罩元素（Mantine Overlay 的静态类名） */
export const findDockOverlay = (root: HTMLElement | null): HTMLElement | null =>
  root?.querySelector<HTMLElement>('[class*="mantine-Overlay-root"]') ?? null;

/** 遮罩跟着框体淡入 / 淡出；减少动态偏好时保持原样 */
export const fadeDockOverlay = (
  root: HTMLElement | null,
  direction: 'in' | 'out',
  duration: number,
): void => {
  const overlay = findDockOverlay(root);

  if (overlay === null || prefersReducedMotion()) {
    return;
  }

  overlay.getAnimations().forEach((animation) => animation.cancel());

  if (direction === 'in') {
    overlay.style.opacity = '0';
  }

  overlay.animate(
    [
      { opacity: direction === 'in' ? 0 : 1 },
      { opacity: direction === 'in' ? 1 : 0 },
    ],
    { duration, easing: 'ease', fill: 'both' },
  );
};
