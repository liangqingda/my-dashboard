/**
 * 弹窗开合动画：打开时从「用户点的那一点」长出来，关闭时缩回同一点。
 *
 * 关闭不立刻卸载：先播一段反向动画，结束才调 `onClose`。这样业务侧「关窗即清数据、
 * 组件直接 `return null`」的写法不用改——动画期间框体与内容都还活着（视频也还是活画面），
 * 动画结束才随 `onClose` 一起卸。代价是 `onClose` 晚一拍生效，页面状态晚一拍清空。
 *
 * 分工：程序坞窗口（`origin: 'dock'`）的整套开合由 `DockWindowHost` 负责，这一层传
 * `enabled: false`；全屏时不做几何位移（100vw 从一个小点长出来太夸张），只淡入淡出。
 */

/* eslint-disable no-param-reassign -- 这里收到的参数就是待改写的弹窗框体，直接写它的 style 是这套动画的唯一职责 */
import { useCallback, useLayoutEffect, useEffect, useRef } from 'react';

import { prefersReducedMotion, shiftBetweenRects } from '@/utils/motion-geometry';
import type { MotionRect } from '@/utils/motion-geometry';
import { readPointerOrigin, resolveOriginRect } from '@/utils/pointer-origin';
import type { PointerOrigin } from '@/utils/pointer-origin';

import {
  MODAL_ENTER_DURATION,
  MODAL_EXIT_DURATION,
  MODAL_FADE_DURATION,
  MODAL_MIN_ORIGIN_SCALE,
  MODAL_OVERLAY_SELECTOR,
  MODAL_SURFACE_ATTRIBUTE,
  MODAL_SURFACE_SELECTOR,
} from '../constants';

type UseModalMotionParams = {
  /** 这一层是否自己播开合：程序坞窗口交给 Provider，传 false */
  enabled: boolean;
  /** 是否允许「缩放 + 位移」：全屏时传 false，只做淡入淡出 */
  geometryEnabled: boolean;
  /** 真正关闭：动画播完才调 */
  onClose: () => void;
  /** 是否打开 */
  opened: boolean;
  /** 找框体用的根节点 id（与根节点上的 `data-motion-surface` 同值） */
  surfaceId: string;
};

type UseModalMotionResult = {
  /** 是否正在播关闭动画：期间弹窗仍算打开，重复关闭只认第一次 */
  isClosing: () => boolean;
  /** 关闭入口：先动画、再 `onClose` */
  requestClose: () => void;
};

/**
 * 动画框体：同一 id 的根节点里只认真挂着内容框的那个。
 * 关掉的弹窗组件库会留下空壳根节点，空壳带着标记会让下一次开窗量到空壳、整段动画被跳过。
 */
const findRoot = (surfaceId: string): HTMLElement | null => {
  const roots = [
    ...document.querySelectorAll<HTMLElement>(`[${MODAL_SURFACE_ATTRIBUTE}]`),
  ].filter((root) => root.dataset.motionSurface === surfaceId);

  return (
    roots.findLast((root) => root.querySelector(MODAL_SURFACE_SELECTOR) !== null) ??
    null
  );
};

const findContent = (surfaceId: string): HTMLElement | null =>
  findRoot(surfaceId)?.querySelector<HTMLElement>(MODAL_SURFACE_SELECTOR) ?? null;

/** 打开动画收尾：去掉临时内联样式再取消动画，避免 `fill: both` 的终态一直挂在框体上 */
const restoreContent = (content: HTMLElement, animation: Animation): void => {
  content.style.removeProperty('opacity');
  content.style.removeProperty('pointer-events');
  content.style.removeProperty('transform-origin');
  content.style.removeProperty('will-change');
  animation.cancel();
};

const fadeIn = (content: HTMLElement): Animation => {
  content.style.opacity = '0';
  content.style.removeProperty('pointer-events');

  const animation = content.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: MODAL_FADE_DURATION,
    easing: 'ease-out',
    fill: 'both',
  });

  void animation.finished
    .catch(() => undefined)
    .then(() => restoreContent(content, animation));

  return animation;
};

/** 从打开点长大：起点是触发元素本身的矩形，中心对齐后一路放大到终态 */
const growFromOrigin = (content: HTMLElement, origin: MotionRect): Animation => {
  const contentRect = content.getBoundingClientRect();
  const { dx, dy, scale } = shiftBetweenRects(contentRect, origin);
  const startScale = Math.min(Math.max(scale, MODAL_MIN_ORIGIN_SCALE), 1);

  content.style.opacity = '0';
  content.style.transformOrigin = 'center';
  content.style.willChange = 'transform, opacity';
  content.style.removeProperty('pointer-events');

  const animation = content.animate(
    [
      {
        opacity: 0.2,
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${startScale})`,
      },
      {
        offset: 0.68,
        opacity: 0.92,
        transform: 'translate3d(0, 0, 0) scale(1.012)',
      },
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
    ],
    {
      duration: MODAL_ENTER_DURATION,
      easing: 'cubic-bezier(0.2, 0.86, 0.22, 1)',
      fill: 'both',
    },
  );

  void animation.finished
    .catch(() => undefined)
    .then(() => restoreContent(content, animation));

  return animation;
};

const animateEnter = (
  surfaceId: string,
  origin: PointerOrigin | null,
): Animation | null => {
  const content = findContent(surfaceId);

  if (content === null || prefersReducedMotion()) {
    return null;
  }

  content.getAnimations().forEach((animation) => animation.cancel());

  return origin === null ? fadeIn(content) : growFromOrigin(content, origin.rect);
};

/** 遮罩跟着框体一起退：否则窗在缩、背景先没了 */
const fadeOverlay = (root: HTMLElement): void => {
  const overlay = root.querySelector<HTMLElement>(MODAL_OVERLAY_SELECTOR);

  if (overlay === null) {
    return;
  }

  overlay.getAnimations().forEach((animation) => animation.cancel());

  const start = Number.parseFloat(getComputedStyle(overlay).opacity);

  overlay.animate(
    [{ opacity: Number.isFinite(start) ? start : 1 }, { opacity: 0 }],
    { duration: MODAL_EXIT_DURATION, easing: 'ease', fill: 'both' },
  );
};

const fadeOut = (content: HTMLElement): Animation => {
  const start = Number.parseFloat(getComputedStyle(content).opacity);

  return content.animate(
    [{ opacity: Number.isFinite(start) ? start : 1 }, { opacity: 0 }],
    { duration: MODAL_EXIT_DURATION, easing: 'ease', fill: 'both' },
  );
};

/** 缩回打开点：反向走「长大」的三段，落点按目标此刻的位置算 */
const shrinkToOrigin = (content: HTMLElement, origin: MotionRect): Animation => {
  const contentRect = content.getBoundingClientRect();
  const { dx, dy, scale } = shiftBetweenRects(contentRect, origin);
  const endScale = Math.max(scale, MODAL_MIN_ORIGIN_SCALE);

  content.style.transformOrigin = 'center';
  content.style.willChange = 'transform, opacity';

  return content.animate(
    [
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      {
        offset: 0.72,
        opacity: 0.82,
        transform: `translate3d(${dx * 0.9}px, ${dy * 0.9}px, 0) scale(${endScale * 1.12})`,
      },
      {
        opacity: 0.28,
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${endScale})`,
      },
    ],
    {
      duration: MODAL_EXIT_DURATION,
      easing: 'cubic-bezier(0.55, 0.02, 0.72, 0.36)',
      fill: 'both',
    },
  );
};

const playExit = async (
  surfaceId: string,
  origin: PointerOrigin | null,
): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  const root = findRoot(surfaceId);
  const content =
    root?.querySelector<HTMLElement>(MODAL_SURFACE_SELECTOR) ?? null;

  if (root === null || content === null) {
    return;
  }

  content.getAnimations().forEach((animation) => animation.cancel());
  content.style.pointerEvents = 'none';
  fadeOverlay(root);

  const target = resolveOriginRect(origin);
  const animation =
    target === null ? fadeOut(content) : shrinkToOrigin(content, target);

  await animation.finished.catch(() => undefined);

  /*
   * 不能取消回原样：`onClose` 之后的卸载不是同一帧完成的，中途回弹会闪一帧终态。
   * 收起后停在透明上，等下一次打开时由开窗动画重新接管。
   */
  animation.cancel();
  content.style.opacity = '0';
  content.style.removeProperty('transform-origin');
  content.style.removeProperty('will-change');
};

export const useModalMotion = ({
  enabled,
  geometryEnabled,
  onClose,
  opened,
  surfaceId,
}: UseModalMotionParams): UseModalMotionResult => {
  const originRef = useRef<PointerOrigin | null>(null);
  const closingRef = useRef(false);
  const openedRef = useRef(opened);
  const onCloseRef = useRef(onClose);
  /** 每次开合都作废上一轮：重开时迟到的 `onClose` 不能把新窗关掉 */
  const tokenRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openedRef.current = opened;
  }, [opened]);

  useLayoutEffect(() => {
    if (!opened || !enabled) {
      return undefined;
    }

    // 重新打开：作废上一轮还没跑完的关闭，状态不再算「正在收」
    tokenRef.current += 1;
    closingRef.current = false;

    const origin = geometryEnabled ? readPointerOrigin() : null;

    originRef.current = origin;

    const animation = animateEnter(surfaceId, origin);

    return () => animation?.cancel();
  }, [enabled, geometryEnabled, opened, surfaceId]);

  const isClosing = useCallback(() => closingRef.current, []);

  const requestClose = useCallback(() => {
    if (!enabled) {
      onCloseRef.current();

      return;
    }

    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    tokenRef.current += 1;
    const token = tokenRef.current;

    const finish = () => {
      if (token !== tokenRef.current) {
        return;
      }

      closingRef.current = false;

      if (openedRef.current) {
        onCloseRef.current();
      }
    };

    void playExit(surfaceId, originRef.current).then(finish, finish);
  }, [enabled, surfaceId]);

  return { isClosing, requestClose };
};

/* eslint-enable no-param-reassign -- 以下不再是动画改写，恢复通用规则 */
