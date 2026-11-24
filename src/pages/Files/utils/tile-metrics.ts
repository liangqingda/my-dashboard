/**
 * 瓦片的尺寸换算：图源基准边长固定在常量里，分类 / 应用 / 文件夹图标按比例换算，
 * 三种瓦片不各算一遍；缩略图自身宽度随瓦片自适应，不在这里给固定高度。
 */

import { DEFAULT_TILE_MEDIA_SIZE, FOLDER_ICON_SCALE, TILE_ICON_SCALE } from '../constants';

/** 分类图标 / 应用图标边长：跟图源基准边长成比例 */
export const tileIconSize = (): number =>
  Math.round(DEFAULT_TILE_MEDIA_SIZE * TILE_ICON_SCALE);

/** 文件夹图标边长：比例高一点补上文件夹形状自带的白边 */
export const folderIconSize = (): number =>
  Math.round(DEFAULT_TILE_MEDIA_SIZE * FOLDER_ICON_SCALE);
