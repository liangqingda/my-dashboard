/**
 * 拖整条瓦片时的拖拽影像入参。
 */

import type { DragTileImage } from '../types';

/** 入参 */
export type DragTilesProps = {
  /** 起拖那一刻拷下的那条瓦片（HTML + 尺寸），影像按它原样画 */
  image: DragTileImage;
  /** 一起拖了几条：大于一条时右上角标数量 */
  many: number | null;
};
