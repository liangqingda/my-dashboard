/**
 * 文件页标题栏操作按钮组的 props。
 */

import type {
  FileCategory,
  FavoriteEntry,
  VideoOpenMode,
} from '../types';

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
  /** 类型筛选的排除项（取消勾选的分类）；空数组表示各档全显示 */
  excludedCategories: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 视频点击后的去向（设置面板第一项） */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名 */
  videoApp: string;
  /** 改视频去向 */
  onVideoOpenModeChange: (mode: VideoOpenMode) => void;
  /** 改外部打开的应用 */
  onVideoAppChange: (app: string) => void;
  /** 当前打开的弹层；null 表示都关着 */
  openPanel: FilesActionsPanel | null;
  /** 调起系统目录选择器选择目录 */
  onPickDir: () => void;
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
  /** 切换排除项（取消 / 恢复勾选某一类） */
  onExcludedChange: (next: FileCategory[]) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 弹层开合：打开某一块，或传 null 全部收起 */
  onPanelChange: (panel: FilesActionsPanel | null) => void;
};
