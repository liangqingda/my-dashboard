/**
 * 最近一次「用户是在哪一点打开的」：给弹窗开合动画当起点与回落点。
 *
 * 一个应用级监听就够：捕获阶段记下指针按下的可点目标（按钮、瓦片这类会「长出弹窗」的东西），
 * 键盘触发的打开（`click` 且 `detail === 0`）回退到当前聚焦元素。业务侧因此不用给每个打开入口
 * 传 ref，`FreeModal` 在打开那一刻读一次就行。
 *
 * 装监听必须在用户第一次点击之前：入口是应用启动时的 `ensurePointerOrigin()`，不是弹窗挂载时——
 * 首次打开就按需挂载的弹窗会赶不上那一下点击。
 */

import type { MotionRect } from './motion-geometry';

/** 一次「打开来源」 */
export type PointerOrigin = {
  /** 触发元素：关窗时优先按它现在的位置回落（页面滚过、列表重排后仍对得上） */
  element: HTMLElement | null;
  /** 起点矩形：可点目标本体，或指针处一个固定小方块 */
  rect: MotionRect;
  /** 记录时刻（`performance.now()`）；超过时效视为过期 */
  at: number;
};

/** 打开点最多用这么久：程序化打开弹窗时不该拿上一次点击当起点 */
export const POINTER_ORIGIN_STALE_MS = 500;

/** 没有可用目标时，落点用这个小方块：视觉上就是「从指尖长出来」 */
const POINT_SIZE = 28;

/**
 * 超过这个尺寸的可点目标改按指针点算：整行、整块表格点下去，
 * 从整块中间长出来看不出「是从哪一下开始的」。
 */
const MAX_ANCHOR_SIZE = 320;

/** `closest` 认的可点目标：原生按钮 / 链接 / 显式声明，够覆盖瓦片与自定义行按钮 */
const ANCHOR_SELECTOR = 'button, a, [role="button"], [data-motion-anchor]';

let lastOrigin: PointerOrigin | null = null;
let tracking = false;

/** 元素当前是否还在视口里：滚走的按钮不该把窗缩到屏幕外 */
const isOnScreen = (rect: DOMRect): boolean =>
  rect.width > 0 &&
  rect.height > 0 &&
  rect.right > 0 &&
  rect.bottom > 0 &&
  rect.left < window.innerWidth &&
  rect.top < window.innerHeight;

const rectFromElement = (element: HTMLElement | null): MotionRect | null => {
  if (element === null || !element.isConnected) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.width > MAX_ANCHOR_SIZE ||
    rect.height > MAX_ANCHOR_SIZE
  ) {
    return null;
  }

  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
};

const resolveAnchor = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest<HTMLElement>(ANCHOR_SELECTOR);

  return anchor ?? (target instanceof HTMLElement ? target : null);
};

const remember = (origin: PointerOrigin): void => {
  lastOrigin = origin;
};

const onPointerDown = (event: PointerEvent): void => {
  const element = resolveAnchor(event.target);
  const rect =
    rectFromElement(element) ??
    ({
      height: POINT_SIZE,
      left: event.clientX - POINT_SIZE / 2,
      top: event.clientY - POINT_SIZE / 2,
      width: POINT_SIZE,
    } satisfies MotionRect);

  remember({ at: performance.now(), element, rect });
};

/** 键盘触发（回车 / 空格）的 click 没有指针坐标，只能退回聚焦元素 */
const onClick = (event: MouseEvent): void => {
  if (event.detail !== 0) {
    return;
  }

  const element = resolveAnchor(event.target);
  const rect = rectFromElement(element);

  if (rect !== null) {
    remember({ at: performance.now(), element, rect });
  }
};

/** 应用启动时调一次：监听必须在第一次点击之前挂上 */
export const ensurePointerOrigin = (): void => {
  if (tracking) {
    return;
  }

  tracking = true;
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
};

/**
 * 读最近一次打开来源；过期的直接当作「没有来源」（程序坞恢复、代码里直接打开都属于这种）。
 * 只读不消费：同一 tick 里两扇窗同时打开时都能拿到同一点，不需要各自记一份。
 */
export const readPointerOrigin = (): PointerOrigin | null => {
  if (lastOrigin === null) {
    return null;
  }

  return performance.now() - lastOrigin.at > POINTER_ORIGIN_STALE_MS
    ? null
    : lastOrigin;
};

/** 关窗时用的落点：优先按钮当前所在位置，滚走 / 已被移除再退回打开时记下的矩形 */
export const resolveOriginRect = (origin: PointerOrigin | null): MotionRect | null => {
  if (origin === null) {
    return null;
  }

  if (origin.element !== null && origin.element.isConnected) {
    const rect = origin.element.getBoundingClientRect();

    if (isOnScreen(rect)) {
      return {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    }
  }

  return origin.rect;
};
