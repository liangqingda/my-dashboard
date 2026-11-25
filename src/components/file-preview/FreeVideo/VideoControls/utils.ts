/**
 * 进度条悬停预览的取值：把指针位置摊成「这一处的时间 + 浮层横向位置」。
 *
 * 时间必须与 Mantine Slider 松手后取值**同一套坐标系**：它用 root 的矩形（`useMove` 里
 * `(clientX - rootRect.left) / rootRect.width`）算比例，轨道本身左右各缩进半个拇指宽，
 * 按轨道算与按 root 算差出来的是固定比例，片子越长差得越多——两三个小时的长片上就是好几秒。
 * 浮层位置同样以容器为坐标系（它以容器为定位祖先）。
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

/** 指针位置 → 浮层位置与这一处的时间（与 Mantine 松手取值同一套坐标系，分毫不差） */
export const seekPreviewAt = ({
  clientX,
  containerLeft,
  containerWidth,
  duration,
  previewWidth,
}: SeekPreviewParams): SeekPreviewState => {
  const ratio = Math.min(
    Math.max((clientX - containerLeft) / containerWidth, 0),
    1,
  );

  return {
    left: clampPreviewCenter(
      ratio * containerWidth,
      containerWidth,
      previewWidth,
    ),
    time: ratio * duration,
  };
};
