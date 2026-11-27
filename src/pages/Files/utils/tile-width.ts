/**
 * 瓦片宽度的档位落位：滑块的 5 个档位（`TILE_WIDTH_MIN` 起、每隔 `TILE_WIDTH_STEP` 一档）
 * 由常量给出，这里只负责把任意像素值吸到最近的那一档。
 *
 * 只在读存储时用：老版本存的是 168 / 176 这种不在档位上的值，直接塞给带步长的滑块，
 * 拇指会落在档位之间、拖一下才跳回来。写回时本来就只会是档位值，不必再吸一次。
 */

import { TILE_WIDTH_MAX, TILE_WIDTH_MIN, TILE_WIDTH_STEP } from '../constants';

/** 把任意宽度吸到最近档位，并夹在区间内：档位之外的值不会漏给滑块 */
export const snapTileWidth = (width: number): number => {
  const stopped =
    TILE_WIDTH_MIN + Math.round((width - TILE_WIDTH_MIN) / TILE_WIDTH_STEP) * TILE_WIDTH_STEP;

  return Math.min(TILE_WIDTH_MAX, Math.max(TILE_WIDTH_MIN, stopped));
};
