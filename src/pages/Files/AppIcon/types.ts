/**
 * 应用图标的 props。
 */

import type { AppEntry } from '../types';

/** 应用图标：网格瓦片用大号，表格行用小号 */
export type AppIconProps = {
  /** 应用摘要：路径用于取图标 */
  app: AppEntry;
  /** 图标边长（像素）：瓦片按图源基准边长换算，表格行 16 */
  size: number;
  /** 附加 class：只补颜色 / 布局，不改尺寸 */
  className?: string;
};
