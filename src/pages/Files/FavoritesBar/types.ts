/**
 * 收藏条的 props。
 */

import type { FavoriteEntry } from '../types';

/** 收藏条的入参 */
export type FavoritesBarProps = {
  /** 收藏的目录列表 */
  favorites: FavoriteEntry[];
  /** 当前打开的目录绝对路径；用于高亮正在浏览的那条 */
  currentDir: string;
  /** 点收藏条目直达该目录 */
  onOpen: (dir: string) => void;
  /** 点条目的移除按钮，从收藏里删掉 */
  onRemove: (path: string) => void;
};
