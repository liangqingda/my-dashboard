/**
 * 进度条悬停预览的取值：把指针位置摊成「第几帧 + 浮层横向位置」。
 *
 * 只用容器矩形近似轨道范围：Mantine Slider 的轨道与 root 同宽，两端拇指占位会让比例
 * 差几个像素，肉眼看不到。帧下标按 `time / frameSpan` 取整，末帧夹在数组尽头。
 */

import { SEEK_PREVIEW_EDGE_GAP, SEEK_PREVIEW_WIDTH } from '../constants';

import type { SeekPreviewParams, SeekPreviewState } from './types';

/** 浮层中心夹在容器内：宽度固定，两端各让开半宽，贴边时浮层不被控制栏裁掉 */
const clampPreviewCenter = (center: number, containerWidth: number): number => {
  const half = SEEK_PREVIEW_WIDTH / 2;

  if (containerWidth <= SEEK_PREVIEW_WIDTH + SEEK_PREVIEW_EDGE_GAP * 2) {
    return containerWidth / 2;
  }

  return Math.min(
    Math.max(center, half + SEEK_PREVIEW_EDGE_GAP),
    containerWidth - half - SEEK_PREVIEW_EDGE_GAP,
  );
};

/** 指针位置 → 帧下标、浮层位置与这一处的时间 */
export const seekPreviewAt = ({
  clientX,
  containerLeft,
  containerWidth,
  duration,
  frameCount,
  frameSpan,
}: SeekPreviewParams): SeekPreviewState => {
  const ratio = Math.min(Math.max((clientX - containerLeft) / containerWidth, 0), 1);
  const time = ratio * duration;
  const index = Math.floor(time / frameSpan);

  return {
    index: Math.max(Math.min(index, frameCount - 1), 0),
    left: clampPreviewCenter(ratio * containerWidth, containerWidth),
    time,
  };
};
