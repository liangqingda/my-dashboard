import type { StageView } from './types';

/** 尺寸（px）：图片这里指「未缩放的布局尺寸」，舞台指它的内框尺寸 */
export type FitSize = {
  width: number;
  height: number;
};

/** 把值夹在 min / max 之间 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 把位移夹在「放大后多出来的区域」内：1 倍时上限为 0（画面贴住舞台中心），
 * 放大后拖不出黑边，缩回 1 倍时自动回正。
 */
export const limitView = (
  view: StageView,
  image: FitSize,
  stage: FitSize,
): StageView => {
  // 布局尺寸不受 transform 影响，量到的就是「1 倍时图片在舞台里占多大」
  const maxX = Math.max(0, (image.width * view.scale - stage.width) / 2);
  const maxY = Math.max(0, (image.height * view.scale - stage.height) / 2);

  return {
    scale: view.scale,
    x: clamp(view.x, -maxX, maxX),
    y: clamp(view.y, -maxY, maxY),
  };
};

/**
 * 以锚点改倍率：锚点是「相对舞台中心」的屏幕坐标，缩放前后它下面的像素停在原地。
 * 屏幕位置 = 未缩放坐标 × 倍率 + 位移，所以锚点不动 ⇒ 新位移 = 锚点 − (锚点 − 旧位移) × 倍率比。
 */
export const anchorView = (
  view: StageView,
  scale: number,
  anchorX: number,
  anchorY: number,
): StageView => {
  const ratio = scale / view.scale;

  return {
    scale,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  };
};
