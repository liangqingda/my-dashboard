/**
 * 悬停预览框的尺寸：宽度跟「视频画面实际显示的那块」走（`SEEK_PREVIEW_WIDTH_RATIO`），
 * 高度按画面比例算，并受舞台可用高度约束——浮层从控制栏往上浮，太高会顶到弹窗上沿被裁掉。
 *
 * 用视频画面而不是舞台宽度：`object-fit: contain` 下竖屏视频两侧留黑边，
 * 按舞台算会让浮层比画面还宽，看起来不像「画面的放大」。
 */

import {
  SEEK_PREVIEW_MIN_WIDTH,
  SEEK_PREVIEW_STAGE_GAP,
  SEEK_PREVIEW_WIDTH_RATIO,
  VIDEO_FALLBACK_ASPECT,
} from '../constants';

/** 尺寸计算的入参：舞台矩形与视频画面比例 */
export type SeekPreviewSizeParams = {
  /** 舞台宽度（CSS px） */
  stageWidth: number;
  /** 舞台高度（CSS px） */
  stageHeight: number;
  /** 视频画面宽高比；还没解出元数据时传 0 */
  aspect: number;
};

/** 预览框尺寸（CSS px） */
export type SeekPreviewSize = {
  width: number;
  height: number;
};

/** 算预览框尺寸：宽度 60%、高度按比例，且不超出舞台可见高度 */
export const seekPreviewSize = ({
  stageWidth,
  stageHeight,
  aspect,
}: SeekPreviewSizeParams): SeekPreviewSize => {
  const safeAspect = aspect > 0 ? aspect : VIDEO_FALLBACK_ASPECT;

  if (stageWidth <= 0 || stageHeight <= 0) {
    return {
      height: Math.round(SEEK_PREVIEW_MIN_WIDTH / safeAspect),
      width: SEEK_PREVIEW_MIN_WIDTH,
    };
  }

  /** 画面实际显示的宽度：竖屏视频两侧留黑边，取舞台高度换算出来的那一段 */
  const displayWidth = Math.min(stageWidth, stageHeight * safeAspect);
  const targetWidth = Math.min(
    displayWidth * SEEK_PREVIEW_WIDTH_RATIO,
    Math.max(stageHeight - SEEK_PREVIEW_STAGE_GAP, 0) * safeAspect,
    stageWidth,
  );
  const width = Math.round(Math.max(targetWidth, SEEK_PREVIEW_MIN_WIDTH));

  return { height: Math.round(width / safeAspect), width };
};
