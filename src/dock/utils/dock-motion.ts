/**
 * 程序坞窗口的几何动画：从图标中心展开 / 收回到图标中心、左右滑动换窗、关闭淡出。
 *
 * 收放用「中心缩放 + 平移」：起点 / 终点是图标中心，窗口只是在那里由小长到大，
 * 不再做贴边漏斗，避免视觉上落到程序坞外面。
 */

/* eslint-disable no-param-reassign -- 动画函数收到的参数就是待改写的 DOM 框体，直接写它的 style 是这套工具的唯一职责 */
import { MOTION_EASING } from '@/utils/motion-easing';
import { prefersReducedMotion, shiftBetweenRects } from '@/utils/motion-geometry';

import {
  DOCK_DISMISS_DURATION,
  DOCK_SHRINK_DURATION,
  DOCK_SLIDE_DURATION,
  DOCK_SLIDE_OUT_DURATION,
  DOCK_TRANSFORM_DURATION,
  DOCK_WINDOW_Z_INDEX,
} from '../constants';

/** 换窗方向：`next` 往程序坞后面翻（旧窗向左、新窗从右进），`prev` 反过来 */
export type DockSlideDirection = 'next' | 'prev';

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

/** 同一 id 的弹窗根节点可能不止一个：关闭后组件库只卸载内容框，空壳根节点还在 DOM 里 */
const dockRootsOf = (id: string): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('[data-dock-surface]'),
].filter((candidate) => candidate.dataset.dockSurface === id);

/** 根节点里真挂着内容框：空壳（关掉的弹窗）没有 */
const hasContent = (root: HTMLElement): boolean =>
  root.querySelector('section[role="dialog"]') !== null;

/**
 * 窗口的根节点（含遮罩层）：只认挂着内容框的那一个；
 * 多个都挂着时取最后挂进 DOM 的——新窗总排在旧壳之后。
 */
export const findDockRoot = (id: string): HTMLElement | null => {
  const roots = dockRootsOf(id);

  return roots.findLast(hasContent) ?? roots.at(-1) ?? null;
};

/**
 * 窗口框体：入口是弹窗根节点上的 `data-dock-surface`；
 * Mantine 把内容框渲染成 `<section role="dialog">`，按它取动画对象。
 */
export const findDockSurface = (id: string): HTMLElement | null =>
  findDockRoot(id)?.querySelector<HTMLElement>('section[role="dialog"]') ?? null;

/** 程序坞里的一个项目 */
export const findDockItem = (id: string): HTMLElement | null => {
  const items = document.querySelectorAll<HTMLElement>('[data-dock-item]');
  const item = [...items].find((candidate) => candidate.dataset.dockItem === id);

  return item ?? null;
};

/**
 * 收放动画的落点：程序坞展开时是那个图标；手动收起时条目在屏幕下方，
 * 就落到右下角那颗开关上，避免窗口缩到屏幕外面去。
 */
const findDockAnchor = (id: string): HTMLElement | null => {
  const item = findDockItem(id);

  if (item !== null && item.closest('[data-dock-open="true"]') !== null) {
    return item;
  }

  return document.querySelector<HTMLElement>('[data-dock-toggle]');
};

/**
 * 程序坞 → 窗口：真实框体从图标中心由小长到大。
 * 调用方在布局阶段先把框体隐藏，避免动画起来前闪一帧终态。
 */
export const growWindowFromDock = async (
  content: HTMLElement,
  id: string,
): Promise<void> => {
  const item = findDockAnchor(id);

  if (prefersReducedMotion() || item === null) {
    content.style.removeProperty('opacity');
    return;
  }

  const contentRect = content.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const { dx, dy, scale } = shiftBetweenRects(contentRect, itemRect);

  content.style.opacity = '0';
  content.style.transformOrigin = 'center';
  content.style.willChange = 'transform, opacity';

  const animation = content.animate(
    [
      {
        opacity: 0.2,
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
      },
      { offset: 0.68, opacity: 0.92, transform: 'translate3d(0, 0, 0) scale(1.012)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
    ],
    {
      duration: DOCK_TRANSFORM_DURATION,
      easing: MOTION_EASING.standard,
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  content.style.removeProperty('opacity');
  content.style.removeProperty('will-change');
  content.style.removeProperty('transform-origin');
  animation.cancel();
};

/**
 * 窗口 → 程序坞：真实框体由大缩到图标正中心。
 * 只作用于框体；遮罩由调用方同时淡出。
 */
export const shrinkWindowToDock = async (
  content: HTMLElement,
  id: string,
): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  // 程序坞可能刚被自动展开：等目标图标真正露出来再量落点，不能退回右下角开关
  const item = await waitForFrames(() => {
    const candidate = findDockItem(id);

    return candidate !== null &&
      candidate.closest('[data-dock-open="true"]') !== null
      ? candidate
      : null;
  });

  if (item === null) {
    return;
  }

  const contentRect = content.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const { dx, dy, scale } = shiftBetweenRects(contentRect, itemRect);

  content.style.transformOrigin = 'center';
  content.style.willChange = 'transform, opacity';

  const animation = content.animate(
    [
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      {
        offset: 0.72,
        opacity: 0.82,
        transform: `translate3d(${dx * 0.9}px, ${dy * 0.9}px, 0) scale(${scale * 1.12})`,
      },
      {
        opacity: 0.28,
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
      },
    ],
    {
      duration: DOCK_SHRINK_DURATION,
      easing: MOTION_EASING.exit,
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
};

/** 从程序坞移除当前窗：按弹窗默认的淡出，不做收坞位移 */
export const dismissWindow = async (content: HTMLElement): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  const animation = content.animate(
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.98)' },
    ],
    {
      duration: DOCK_DISMISS_DURATION,
      easing: MOTION_EASING.standard,
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
};

/** 换窗时新窗稍微压住旧窗的那一点宽度 */
const SLIDE_OVERLAP = 56;

/**
 * 新窗的滑动起点：`next` 从右边进，`prev` 从左边进。
 * 起点不是屏幕外，而是命中旧窗右 / 左边缘前的 56px，所以下一扇一出现就压着当前那扇。
 */
export const slideOffset = (
  content: HTMLElement,
  direction: DockSlideDirection,
): number => {
  const { width } = content.getBoundingClientRect();
  const enter = Math.max(width - SLIDE_OVERLAP, 0);

  return direction === 'next' ? enter : -enter;
};

/** 新窗从屏幕外侧滑到原位；不带淡入淡出 */
export const slideWindowIn = async (
  content: HTMLElement,
  direction: DockSlideDirection,
): Promise<void> => {
  if (prefersReducedMotion()) {
    content.style.removeProperty('transform');
    return;
  }

  const start = slideOffset(content, direction);

  content.style.transformOrigin = 'center';
  content.style.willChange = 'transform';

  const animation = content.animate(
    [
      { transform: `translate3d(${start}px, 0, 0)` },
      { transform: 'translate3d(0, 0, 0)' },
    ],
    {
      duration: DOCK_SLIDE_DURATION,
      easing: MOTION_EASING.emphasized,
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  content.style.removeProperty('transform');
  content.style.removeProperty('will-change');
  content.style.removeProperty('transform-origin');
  animation.cancel();
};

/**
 * 旧窗整块向左 / 向右滑出屏幕。
 *
 * 旧窗在换窗后会被立即卸载，所以这里先克隆它的内容框、固定到原位置再滑走，
 * 新旧两扇同时在屏幕上完成「旧的出去、新的进来」。
 */
export const slideWindowOut = (
  source: HTMLElement | null,
  direction: DockSlideDirection,
): void => {
  if (source === null || prefersReducedMotion()) {
    return;
  }

  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.removeAttribute('data-dock-surface');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.transformOrigin = 'center';
  // 旧窗垫在新窗口层的下边：新窗滑进来时压着它、遮住它，而不是反过来盖住新窗
  clone.style.zIndex = String(DOCK_WINDOW_Z_INDEX - 1);
  clone.style.willChange = 'transform';
  // 组件库 / 内容的 CSS 过渡不能叠加到这条 Web Animation 上，否则旧窗会在结束后继续挪
  clone.style.transition = 'none';
  clone.style.animation = 'none';
  document.body.appendChild(clone);

  /*
   * 旧窗只要完整退出屏幕就够了：按自己左右边缘算距离，别用整屏宽白跑一截。
   * 时长也比新窗短一档，保证下一扇完全就位时，旧窗已经滑完。
   */
  const exitDistance =
    direction === 'next' ? rect.right + 16 : window.innerWidth - rect.left + 16;
  const target = direction === 'next' ? -exitDistance : exitDistance;
  const animation = clone.animate(
    [
      { transform: 'translate3d(0, 0, 0)' },
      { transform: `translate3d(${target}px, 0, 0)` },
    ],
    {
      duration: DOCK_SLIDE_OUT_DURATION,
      easing: MOTION_EASING.exit,
      fill: 'both',
    },
  );

  void animation.finished
    .catch(() => undefined)
    .then(() => clone.remove());
};
/* eslint-enable no-param-reassign -- 文件结束，恢复默认规则 */
