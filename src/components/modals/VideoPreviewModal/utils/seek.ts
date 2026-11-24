/**
 * 算按步长挪一段之后要落到哪个时间点：`←` / `→` 与控制栏那两颗箭头共用一份口径。
 *
 * 时长还没解出来（`duration` 是 `NaN`）时不设上界，只保证不落到负数。
 * 只负责算值——写回 `currentTime` 归调用方，进度条的同步交给元素自己的 `timeupdate`。
 */

import type { FreeModalSeekDirection } from '@/components/modals/FreeModal/types';

/** 返回目标播放位置（秒） */
export const seekTargetTime = (
  element: HTMLVideoElement,
  direction: FreeModalSeekDirection,
  step: number,
): number => {
  const duration = Number.isFinite(element.duration) ? element.duration : 0;
  const delta = direction === 'forward' ? step : -step;
  const upper = duration > 0 ? duration : Number.POSITIVE_INFINITY;

  return Math.min(upper, Math.max(0, element.currentTime + delta));
};
