/**
 * 瓦片的尺寸换算：设置面板只暴露「图源尺寸」与「名称字号」两颗滑块，
 * 图标边长、CSS 变量这些派生值都从这里出，三种瓦片不各算一遍。
 */

import type { CSSProperties } from 'react';

import { FOLDER_ICON_SCALE, TILE_ICON_SCALE } from '../constants';

/** 分类图标 / 应用图标边长：跟图源尺寸成比例，避免一个调大一个不变 */
export const tileIconSize = (tileSize: number): number =>
  Math.round(tileSize * TILE_ICON_SCALE);

/** 文件夹图标边长：同样成比例，比例高一点补上文件夹形状自带的白边 */
export const folderIconSize = (tileSize: number): number =>
  Math.round(tileSize * FOLDER_ICON_SCALE);

/** 瓦片外壳上的两个 CSS 变量：图源与名称的实际尺寸 */
export const tileSizeVars = (
  tileSize: number,
  nameSize: number,
): CSSProperties =>
  ({
    '--tile-media-size': `${tileSize}px`,
    '--tile-name-size': `${nameSize}px`,
  }) as CSSProperties;
