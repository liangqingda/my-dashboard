/**
 * 瓦片的尺寸换算：只有固定尺寸的方形图标（分类 / 应用）在这里按基准边长换算；
 * 缩略图与文件夹图源由样式按瓦片宽度自适应，不参与这里的计算。
 */

import { DEFAULT_TILE_MEDIA_SIZE, TILE_ICON_SCALE } from '../constants';

/** 分类图标 / 应用图标边长：跟图源基准边长成比例 */
export const tileIconSize = (): number =>
  Math.round(DEFAULT_TILE_MEDIA_SIZE * TILE_ICON_SCALE);
