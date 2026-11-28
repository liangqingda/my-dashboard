/**
 * 「窗口 ↔ 程序坞」的神奇效果动画。
 *
 * 收起：把窗口框体的克隆固定在原位，再向程序坞那一格收拢——位移 + 非等比缩放，
 * 同时用 clip-path 把远端边缘比近端收得更快，做出被吸进图标里的漏斗感。
 * 展开：同一组关键帧反着播，作用在真正的窗口框体上。
 *
 * 落点由程序坞项目自己的 `getBoundingClientRect()` 提供，所以鼠标把图标放大时，
 * 窗口也是往放大后的那一格收；减少动态偏好（reduce motion）下直接跳过。
 */

import {
  DOCK_MINIMIZE_DURATION,
  DOCK_RESTORE_DURATION,
  DOCK_SWAP_DURATION,
} from '../constants';
import type { DockPlacement } from '../types';

/** 动画用的矩形（`DOMRect` 的超集） */
export type RectLike = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export const FULL_CLIP = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';

/** 漏斗形：越靠近程序坞的那条边越完整，远端先收 */
export const CLIP_BY_PLACEMENT: Record<
  DockPlacement,
  { mid: string; late: string; end: string; origin: string }
> = {
  right: {
    mid: 'polygon(8% 0, 100% 0, 100% 100%, 30% 100%)',
    late: 'polygon(56% 0, 100% 0, 100% 100%, 76% 100%)',
    end: 'polygon(94% 0, 100% 0, 100% 100%, 97% 100%)',
    origin: '100% 50%',
  },
  left: {
    mid: 'polygon(0 0, 92% 0, 70% 100%, 0 100%)',
    late: 'polygon(0 0, 44% 0, 24% 100%, 0 100%)',
    end: 'polygon(0 0, 6% 0, 3% 100%, 0 100%)',
    origin: '0% 50%',
  },
  top: {
    mid: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)',
    late: 'polygon(0 0, 100% 0, 56% 100%, 44% 100%)',
    end: 'polygon(0 0, 100% 0, 97% 4%, 3% 4%)',
    origin: '50% 0%',
  },
  bottom: {
    mid: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)',
    late: 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)',
    end: 'polygon(3% 96%, 97% 96%, 100% 100%, 0 100%)',
    origin: '50% 100%',
  },
};

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const centerOf = (rect: RectLike) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

/** 等若干帧，等 React 把程序坞项目 / 窗口挂进 DOM */
export const waitForFrames = async <T>(
  find: () => T | null,
  frames = 24,
): Promise<T | null> => {
  const attempt = async (remaining: number): Promise<T | null> => {
    const found = find();

    if (found !== null || remaining <= 1) {
      return found;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    return attempt(remaining - 1);
  };

  return attempt(Math.max(1, frames));
};

/**
 * 窗口框体：入口是弹窗根节点上的 `data-dock-surface`；
 * Mantine 把内容框渲染成 `<section role="dialog">`（`Paper` 的 dialog 语义），按它取动画对象。
 */
export const findDockSurface = (id: string): HTMLElement | null => {
  const roots = document.querySelectorAll<HTMLElement>('[data-dock-surface]');
  const root = [...roots].find((candidate) => candidate.dataset.dockSurface === id);

  return root?.querySelector<HTMLElement>('section[role="dialog"]') ?? null;
};

/** 程序坞里的一个项目 */
export const findDockItem = (id: string): HTMLElement | null => {
  const items = document.querySelectorAll<HTMLElement>('[data-dock-item]');
  const item = [...items].find((candidate) => candidate.dataset.dockItem === id);

  return item ?? null;
};

/** 把 `100% 50%` 这类 transform-origin 换算成原窗口里的绝对点 */
const originPoint = (rect: RectLike, origin: string) => {
  const [xToken = '50%', yToken = '50%'] = origin.split(' ');
  const xRatio = Number.parseFloat(xToken) / 100;
  const yRatio = Number.parseFloat(yToken) / 100;

  return {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio,
  };
};

/**
 * 从原窗口向程序坞落点收放的一帧。
 * 缩放以贴程序坞那条边为原点，所以平移量要按原点算：
 * `T - O - s * (C - O)`，这样终点仍精确落在图标上，中途则贴着屏幕边往里收。
 */
export const transformKeyframe = (
  from: RectLike,
  to: RectLike,
  progress: number,
  origin: string,
) => {
  const fromCenter = centerOf(from);
  const toCenter = centerOf(to);
  const anchor = originPoint(from, origin);
  const scaleX = 1 + (to.width / from.width - 1) * progress;
  const scaleY = 1 + (to.height / from.height - 1) * progress;
  const translateX =
    toCenter.x - anchor.x - (fromCenter.x - anchor.x) * scaleX;
  const translateY =
    toCenter.y - anchor.y - (fromCenter.y - anchor.y) * scaleY;

  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
};

/**
 * 窗口 → 程序坞：真正的窗口框体自己收回去（程序坞窗口关闭 / 再收起时用）。
 * 与 `flyWindowToDock` 的区别是不克隆：窗口还要继续存在到动画结束，交给调用方在
 * `finished` 之后卸载；页面弹窗立即卸载的那条路径仍然走克隆版。
 */
export const shrinkWindowToDock = async (
  content: HTMLElement,
  id: string,
  placement: DockPlacement,
): Promise<void> => {
  const item = findDockItem(id);

  if (prefersReducedMotion() || item === null) {
    return;
  }

  const contentRect = content.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const clip = CLIP_BY_PLACEMENT[placement];
  const frame = content;

  frame.style.transformOrigin = clip.origin;
  frame.style.willChange = 'transform, clip-path';

  const animation = content.animate(
    [
      {
        clipPath: FULL_CLIP,
        offset: 0,
        opacity: 1,
        transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
      },
      {
        clipPath: clip.mid,
        offset: 0.42,
        opacity: 0.96,
        transform: transformKeyframe(contentRect, itemRect, 0.46, clip.origin),
      },
      {
        clipPath: clip.late,
        offset: 0.72,
        opacity: 0.88,
        transform: transformKeyframe(contentRect, itemRect, 0.76, clip.origin),
      },
      {
        clipPath: clip.end,
        offset: 1,
        opacity: 0.62,
        transform: transformKeyframe(contentRect, itemRect, 1, clip.origin),
      },
    ],
    {
      duration: DOCK_MINIMIZE_DURATION,
      easing: 'cubic-bezier(0.5, 0.02, 0.72, 0.38)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
};

/**
 * 程序坞 → 窗口：真正的窗口框体从落点长回自己的位置。
 * 调用方要在布局阶段先把框体隐藏（`opacity: 0`），避免动画起来前闪一帧；
 * 这里结束后会把内联隐藏值清掉。
 */
export const growWindowFromDock = async (
  content: HTMLElement,
  id: string,
  placement: DockPlacement,
): Promise<void> => {
  const item = findDockItem(id);

  if (prefersReducedMotion() || item === null) {
    content.style.removeProperty('opacity');
    return;
  }

  const contentRect = content.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const clip = CLIP_BY_PLACEMENT[placement];
  const frame = content;

  frame.style.opacity = '0';
  frame.style.transformOrigin = clip.origin;
  frame.style.willChange = 'transform, clip-path';

  const animation = content.animate(
    [
      {
        clipPath: clip.end,
        offset: 0,
        opacity: 0.15,
        transform: transformKeyframe(contentRect, itemRect, 1, clip.origin),
      },
      {
        clipPath: clip.late,
        offset: 0.2,
        opacity: 0.58,
        transform: transformKeyframe(contentRect, itemRect, 0.8, clip.origin),
      },
      {
        clipPath: clip.mid,
        offset: 0.5,
        opacity: 0.94,
        transform: transformKeyframe(contentRect, itemRect, 0.48, clip.origin),
      },
      {
        clipPath: FULL_CLIP,
        offset: 1,
        opacity: 1,
        transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
      },
    ],
    {
      duration: DOCK_RESTORE_DURATION,
      easing: 'cubic-bezier(0.18, 0.88, 0.24, 1)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  content.style.removeProperty('opacity');
  content.style.removeProperty('will-change');
  animation.cancel();
};

/**
 * 程序坞里从一扇窗换到另一扇：不回坞、不飞行，只在原位淡入 + 轻微放大。
 * 旧窗口已经被新窗口替换，这里只负责把新框体平滑接上。
 */
export const swapWindowInPlace = async (content: HTMLElement): Promise<void> => {
  const { style } = content;

  if (prefersReducedMotion()) {
    style.removeProperty('opacity');
    return;
  }

  style.opacity = '0';
  style.transformOrigin = 'center';

  const animation = content.animate(
    [
      { opacity: 0.32, transform: 'scale(0.985, 0.985)' },
      { opacity: 1, transform: 'scale(1, 1)' },
    ],
    {
      duration: DOCK_SWAP_DURATION,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  style.removeProperty('opacity');
  animation.cancel();
};
