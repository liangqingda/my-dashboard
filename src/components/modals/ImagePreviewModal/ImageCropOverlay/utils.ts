/**
 * 裁剪选框的手柄与拖拽几何：只算比例，不碰 DOM。
 *
 * 拖拽一律以「按下那一刻的选框」为基准、累加本次指针的总位移，而不是逐次累加增量——
 * 后者在指针抖动或丢帧时会把误差攒进选框，松手后位置对不上指针。
 */

import type { CropRect } from '../utils';

/** 八个方向的手柄：四角 + 四边 */
export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** 手柄的排列顺序（角在前、边在后） */
export const CROP_HANDLES: readonly CropHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

/** 手柄在选框里的位置（百分比，配合 CSS 的 translate(-50%, -50%) 居中） */
export const HANDLE_POSITION: Readonly<
  Record<CropHandle, { left: string; top: string }>
> = {
  e: { left: '100%', top: '50%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  nw: { left: '0%', top: '0%' },
  s: { left: '50%', top: '100%' },
  se: { left: '100%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
};

/** 手柄对应的光标：方向对手的 resize 光标 */
export const HANDLE_CURSOR: Readonly<Record<CropHandle, string>> = {
  e: 'ew-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  s: 'ns-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

/** 夹在 [min, max] 里；调用方保证 min ≤ max */
const clampRange = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** 平移选框：只夹位置，不改尺寸 */
export const moveCropRect = (
  rect: CropRect,
  dx: number,
  dy: number,
): CropRect => ({
  height: rect.height,
  width: rect.width,
  x: clampRange(rect.x + dx, 0, 1 - rect.width),
  y: clampRange(rect.y + dy, 0, 1 - rect.height),
});

/**
 * 拖手柄改尺寸：只动被拖的那一侧，另一侧钉住；
 * 到最小尺寸就停住（不翻转），到图片边界也停住（不让选框出画面）。
 *
 * @param minWidth 最小宽度（比例）；图片很窄时最多按整幅算
 * @param minHeight 最小高度（比例）
 */
export const resizeCropRect = (
  rect: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  minWidth: number,
  minHeight: number,
): CropRect => {
  let left = rect.x;
  let right = rect.x + rect.width;
  let top = rect.y;
  let bottom = rect.y + rect.height;

  if (handle.includes('w')) {
    left = clampRange(left + dx, 0, Math.max(0, right - minWidth));
  }

  if (handle.includes('e')) {
    right = clampRange(right + dx, left + minWidth, 1);
  }

  if (handle.includes('n')) {
    top = clampRange(top + dy, 0, Math.max(0, bottom - minHeight));
  }

  if (handle.includes('s')) {
    bottom = clampRange(bottom + dy, top + minHeight, 1);
  }

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  };
};
