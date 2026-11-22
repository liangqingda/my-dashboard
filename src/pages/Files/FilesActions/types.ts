/**
 * 文件页标题栏操作按钮组的 props。
 */

import type { FileCategory, FavoriteEntry } from '../types';

/** 同时只开一块弹层：收藏面板 / 筛选面板 */
export type FilesActionsPanel = 'favorites' | 'filter';

/** 标题栏操作按钮组的入参；开合状态与各事件都由页面层传入，这里只排按钮与弹层 */
export type FilesActionsProps = {
  /** 取数进行中（打开 / 新建按钮随之禁用） */
  loading: boolean;
  /** 还没选目录时新建与收藏按钮禁用 */
  createDisabled: boolean;
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 还没选目录时收藏按钮禁用 */
  favoriteDisabled: boolean;
  /** 收藏的目录列表，排成收藏面板的条目 */
  favorites: FavoriteEntry[];
  /** 筛选可选分类（当前列表里实际出现过的） */
  typeOptions: { value: FileCategory; label: string }[];
  /** 类型筛选已选分类；空数组表示不过滤 */
  selectedCategories: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 当前打开的弹层；null 表示都关着 */
  openPanel: FilesActionsPanel | null;
  /** 调起系统目录选择器选择目录 */
  onPickDir: () => void;
  /** 在当前目录下新建文件夹并进入改名态 */
  onCreateFolder: () => void;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 点收藏面板某一条直达该目录 */
  onOpenFavorite: (dir: string) => void;
  /** 移除一条收藏 */
  onRemoveFavorite: (path: string) => void;
  /** 切换已选分类 */
  onCategoriesChange: (next: FileCategory[]) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 弹层开合：打开某一块，或传 null 全部收起 */
  onPanelChange: (panel: FilesActionsPanel | null) => void;
};
