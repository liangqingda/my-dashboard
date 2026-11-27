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
  DOCK_FLY_Z_INDEX,
  DOCK_MINIMIZE_DURATION,
  DOCK_RECEIVE_ATTRIBUTE,
  DOCK_RESTORE_DURATION,
} from '../constants';
import type { DockPlacement } from '../types';

/** 动画用的矩形（`DOMRect` 的超集） */
type RectLike = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const FULL_CLIP = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';

/** 漏斗形：越靠近程序坞的那条边越完整，远端先收 */
const CLIP_BY_PLACEMENT: Record<
  DockPlacement,
  { mid: string; end: string; origin: string }
> = {
  right: {
    mid: 'polygon(8% 0, 100% 0, 100% 100%, 30% 100%)',
    end: 'polygon(90% 0, 100% 0, 100% 100%, 96% 100%)',
    origin: '100% 50%',
  },
  left: {
    mid: 'polygon(0 0, 92% 0, 70% 100%, 0 100%)',
    end: 'polygon(0 0, 10% 0, 4% 100%, 0 100%)',
    origin: '0% 50%',
  },
  top: {
    mid: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)',
    end: 'polygon(0 0, 100% 0, 100% 4%, 0 4%)',
    origin: '50% 0%',
  },
  bottom: {
    mid: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)',
    end: 'polygon(0 96%, 100% 96%, 100% 100%, 0 100%)',
    origin: '50% 100%',
  },
};

const prefersReducedMotion = () =>
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

const transformKeyframe = (
  from: RectLike,
  to: RectLike,
  progress: number,
) => {
  const fromCenter = centerOf(from);
  const toCenter = centerOf(to);
  const scaleX = 1 + (to.width / from.width - 1) * progress;
  const scaleY = 1 + (to.height / from.height - 1) * progress;

  return `translate3d(${(toCenter.x - fromCenter.x) * progress}px, ${
    (toCenter.y - fromCenter.y) * progress
  }px, 0) scale(${scaleX}, ${scaleY})`;
};

/**
 * 窗口 → 程序坞：克隆一份窗口框体飞进去（原窗口可以立即卸载，动画继续）。
 * 返回的 Promise 用来在动画结束后清掉克隆。
 */
export const flyWindowToDock = async (
  source: HTMLElement,
  id: string,
  placement: DockPlacement,
): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const item = await waitForFrames(() => findDockItem(id));
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.removeAttribute('data-dock-surface');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.position = 'fixed';
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = String(DOCK_FLY_Z_INDEX);
  clone.style.transformOrigin = 'center';
  clone.style.willChange = 'transform, clip-path';
  clone.style.overflow = 'hidden';
  document.body.appendChild(clone);

  if (item === null) {
    clone.remove();
    return;
  }

  const targetRect = item.getBoundingClientRect();
  const clip = CLIP_BY_PLACEMENT[placement];

  item.setAttribute(DOCK_RECEIVE_ATTRIBUTE, 'true');

  const animation = clone.animate(
    [
      {
        clipPath: FULL_CLIP,
        offset: 0,
        opacity: 1,
        transform: transformKeyframe(sourceRect, targetRect, 0),
      },
      {
        clipPath: clip.mid,
        offset: 0.55,
        opacity: 0.96,
        transform: transformKeyframe(sourceRect, targetRect, 0.55),
      },
      {
        clipPath: clip.end,
        offset: 1,
        opacity: 0.72,
        transform: transformKeyframe(sourceRect, targetRect, 1),
      },
    ],
    {
      duration: DOCK_MINIMIZE_DURATION,
      easing: 'cubic-bezier(0.55, 0, 0.82, 0.35)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  clone.remove();
  item.removeAttribute(DOCK_RECEIVE_ATTRIBUTE);
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

  frame.style.transformOrigin = 'center';
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
        offset: 0.55,
        opacity: 0.96,
        transform: transformKeyframe(contentRect, itemRect, 0.55),
      },
      {
        clipPath: clip.end,
        offset: 1,
        opacity: 0.72,
        transform: transformKeyframe(contentRect, itemRect, 1),
      },
    ],
    {
      duration: DOCK_MINIMIZE_DURATION,
      easing: 'cubic-bezier(0.55, 0, 0.82, 0.35)',
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
  frame.style.transformOrigin = 'center';
  frame.style.willChange = 'transform, clip-path';

  const animation = content.animate(
    [
      {
        clipPath: clip.end,
        offset: 0,
        opacity: 0.15,
        transform: transformKeyframe(contentRect, itemRect, 1),
      },
      {
        clipPath: clip.mid,
        offset: 0.55,
        opacity: 0.9,
        transform: transformKeyframe(contentRect, itemRect, 0.45),
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
      easing: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  content.style.removeProperty('opacity');
  content.style.removeProperty('will-change');
  animation.cancel();
};
