/** 选框几何：相对图片的比例坐标（0–1），存比例不存像素，显示多大、窗口怎么缩都不影响结果 */
export type SelectionRect = {
  /** 左边界比例 */
  x: number;
  /** 上边界比例 */
  y: number;
  /** 宽度比例 */
  width: number;
  /** 高度比例 */
  height: number;
};
