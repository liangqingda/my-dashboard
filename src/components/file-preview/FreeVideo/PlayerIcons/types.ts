/**
 * 播放器 SVG 图标的共同入参：尺寸与描边沿用控制栏那档，颜色走 `currentColor`，
 * 由按钮自身的文字色决定，不在图标里写死。
 */

export type PlayerIconProps = {
  /** 视口尺寸（正方形），与控件字号同一档 */
  size?: number;
  /** 描边线宽；填充型图标不用 */
  stroke?: number;
};
