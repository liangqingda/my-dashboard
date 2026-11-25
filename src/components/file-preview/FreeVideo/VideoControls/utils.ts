/**
 * 进度条悬停预览的取值：把指针位置摊成「这一处的时间 + 浮层横向位置」。
 *
 * 时间必须按**滑杆轨道**的矩形算，不能按外层容器：Mantine 的 root 左右各留了半个拇指宽的内边距
 * （轨道比容器窄 8px），按容器算会和松手后实际跳到的位置差不到一整个拇指，片子上就是一两秒。
 * 浮层位置仍以容器为坐标系（它以容器为定位祖先），只是中心点跟着轨道上的比例算。
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

/** 指针位置 → 浮层位置与这一处的时间（时间按滑杆轨道算，与松手后跳到的位置一致） */
export const seekPreviewAt = ({
  clientX,
  containerLeft,
  containerWidth,
  duration,
  previewWidth,
  trackLeft,
  trackWidth,
}: SeekPreviewParams): SeekPreviewState => {
  /** 轨道量不出来时退回容器：至少还在同一段上，不会算到片外 */
  const left = trackWidth > 0 ? trackLeft : containerLeft;
  const width = trackWidth > 0 ? trackWidth : containerWidth;
  const ratio = Math.min(Math.max((clientX - left) / width, 0), 1);

  return {
    left: clampPreviewCenter(
      left - containerLeft + ratio * width,
      containerWidth,
      previewWidth,
    ),
    time: ratio * duration,
  };
};
