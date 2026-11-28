/** 图片在舞台里的布局矩形（px）：叠加层按它定位，与画面同一坐标系 */
export type ImageBox = {
  /** 距舞台左边缘 */
  left: number;
  /** 距舞台上边缘 */
  top: number;
  /** 图片实际渲染宽 */
  width: number;
  /** 图片实际渲染高 */
  height: number;
};
