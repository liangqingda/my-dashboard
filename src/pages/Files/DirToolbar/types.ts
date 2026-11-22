/**
 * 目录工具栏的 props。
 */

import type { FileCategory, FavoriteEntry } from '../types';

/** 工具栏的入参 */
export type DirToolbarProps = {
  /** 当前目录绝对路径；空串表示还没选目录 */
  currentDir: string;
  /** 取数进行中（打开按钮随之禁用） */
  loading: boolean;
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 还没选目录时收藏按钮禁用 */
  favoriteDisabled: boolean;
  /** 收藏的目录列表，排成收藏面板的条目 */
  favorites: FavoriteEntry[];
  /** 类型筛选可选分类（当前列表里实际出现过的） */
  typeOptions: { value: FileCategory; label: string }[];
  /** 类型筛选已选分类；空数组表示不过滤 */
  selectedCategories: FileCategory[];
  /** 调起系统目录选择器选择目录 */
  onPickDir: () => void;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 点面包屑某一段，回到该层目录 */
  onNavigate: (dir: string) => void;
  /** 点收藏面板某一条直达该目录 */
  onOpenFavorite: (dir: string) => void;
  /** 移除一条收藏 */
  onRemoveFavorite: (path: string) => void;
  /** 切换类型筛选已选分类 */
  onCategoriesChange: (next: FileCategory[]) => void;
};
