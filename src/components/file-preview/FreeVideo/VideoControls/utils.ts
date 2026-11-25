/**
 * 进度条悬停预览的取值：把指针位置摊成「这一处的时间 + 浮层横向位置」。
 *
 * 只用容器矩形近似轨道范围：Mantine Slider 的轨道与 root 同宽，两端拇指占位会让比例
 * 差几个像素，肉眼看不到；时间按比例乘时长，指针停在 [aria-label="播放进度"] 上的
 * 45% 就是 45% 的时长——抽帧与时间标签都用这个值，和点过去实际看到的画面一致。
 */

import { SEEK_PREVIEW_EDGE_GAP } from '../constants';

import type { SeekPreviewParams, SeekPreviewState } from './types';

/** 浮层中心夹在容器内：按实际宽度各让开半宽，贴边时浮层不被控制栏裁掉 */
const clampPreviewCenter = (
  center: number,
  containerWidth: number,
  previewWidth: number,
): number => {
  const half = previewWidth / 2;

  if (containerWidth <= previewWidth + SEEK_PREVIEW_EDGE_GAP * 2) {
    return containerWidth / 2;
  }

  return Math.min(
    Math.max(center, half + SEEK_PREVIEW_EDGE_GAP),
    containerWidth - half - SEEK_PREVIEW_EDGE_GAP,
  );
};

/** 指针位置 → 浮层位置与这一处的时间 */
export const seekPreviewAt = ({
  clientX,
  containerLeft,
  containerWidth,
  duration,
  previewWidth,
}: SeekPreviewParams): SeekPreviewState => {
  const ratio = Math.min(Math.max((clientX - containerLeft) / containerWidth, 0), 1);

  return {
    left: clampPreviewCenter(ratio * containerWidth, containerWidth, previewWidth),
    time: ratio * duration,
  };
};
