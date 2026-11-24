/**
 * 文件页标题栏操作按钮组的 props。
 */

import type { UseFilesSettingsResult } from '../hooks/useFilesSettings';
import type { FavoriteEntry, FileCategory, TypeFilterMode } from '../types';

/** 同时只开一块弹层：收藏面板 / 筛选面板 / 设置面板 */
export type FilesActionsPanel = 'favorites' | 'filter' | 'settings';

/** 标题栏操作按钮组的入参；开合状态与各事件都由页面层传入，这里只排按钮与弹层 */
export type FilesActionsProps = {
  /** 取数进行中（打开 / 新建按钮随之禁用） */
  loading: boolean;
  /** 还没选目录时新建与收藏按钮禁用 */
  createDisabled: boolean;
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 当前是不是网格形态（决定切换按钮的图标与文案） */
  isGridView: boolean;
  /** 还没选目录时收藏按钮禁用 */
  favoriteDisabled: boolean;
  /** 收藏的目录列表，排成收藏面板的条目 */
  favorites: FavoriteEntry[];
  /** 类型筛选的操作方式：多选 / 单选 */
  typeFilterMode: TypeFilterMode;
  /** 当前勾选的分类（全选就是六类都在） */
  selectedCategories: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 文件页设置：设置面板里读写的那几项（值 + 改值回调） */
  settings: UseFilesSettingsResult;
  /** 当前打开的弹层；null 表示都关着 */
  openPanel: FilesActionsPanel | null;
  /** 调起系统目录选择器选择目录 */
  onPickDir: () => void;
  /** 目录选择框正在等待用户选择 */
  picking: boolean;
  /** 当前目录在外接盘上：显示「推出外接盘」按钮 */
  canEject: boolean;
  /** 推出请求进行中 */
  ejecting: boolean;
  /** 点「推出外接盘」：由页面弹二次确认 */
  onEject: () => void;
  /** 在当前目录下新建文件夹并进入改名态 */
  onCreateFolder: () => void;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 网格 ⇄ 表格切换 */
  onToggleViewMode: () => void;
  /** 点收藏面板某一条直达该目录 */
  onOpenFavorite: (dir: string) => void;
  /** 移除一条收藏 */
  onRemoveFavorite: (path: string) => void;
  /** 切换一条收藏的固定状态 */
  onTogglePinnedFavorite: (path: string) => void;
  /** 收藏面板里的拖拽排序 */
  onMoveFavorite: (fromPath: string, toPath: string) => void;
  /** 换一批勾选的分类 */
  onSelectedCategoriesChange: (next: FileCategory[]) => void;
  /** 改类型筛选的操作方式（多选 / 单选） */
  onTypeFilterModeChange: (mode: TypeFilterMode) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 弹层开合：打开某一块，或传 null 全部收起 */
  onPanelChange: (panel: FilesActionsPanel | null) => void;
};
