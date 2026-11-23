/**
 * 文件浏览页的常量：存储键、占位文案、分类档位与骨架形状。
 * 文件归类（扩展名 → 分类）住在中间件 `scripts/vite/files-store.ts`，前端只消费分类键，
 * 不维护第二份扩展名表；分类的中文标签与筛选偏好归本页。
 */

import {
  IconApps,
  IconFile,
  IconFileText,
  IconMarkdown,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import { createChoiceCodec } from '@/utils/local-storage';
import { scopedStorageKey } from '@/utils/page-storage';

import type { FileCategory, FilesViewMode } from './types';

/**
 * 这一页在 localStorage 里的页面标识：对应路由 `/files`
 * （拼法见 `@/utils/page-storage`）。
 */
export const FILES_STORAGE_SCOPE = 'files';

/** 上次打开的目录路径（刷新后回到同一个目录） */
export const CURRENT_DIR_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'current-dir',
);

/** 收藏的目录列表（路径 + 名字，刷新后保留） */
export const FAVORITES_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'favorites',
);

/** 视频点击后的去向（弹窗预览 / 外部应用打开） */
export const VIDEO_OPEN_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-open-mode',
);

/** 外部打开用的应用名；没写过就用默认播放器 */
export const VIDEO_APP_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-app',
);

/** 图片预览弹窗打开时是否直接进全屏 */
export const IMAGE_PREVIEW_FULLSCREEN_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'image-preview-fullscreen',
);

/** 视频预览弹窗打开时是否直接进全屏 */
export const VIDEO_PREVIEW_FULLSCREEN_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'video-preview-fullscreen',
);

/** 外部打开的默认应用：IINA（没装时中间件会回落到它名下，再不行才系统默认） */
export const DEFAULT_VIDEO_APP = 'IINA';

/** 首屏骨架块的数量：只为给一个「正在读」的形状，不假装有数据 */
export const SKELETON_TILES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** 分类键 → 中文标签；键的集合与中间件 `FileCategory` 对齐 */
export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  video: '视频',
  image: '图片',
  pdf: 'PDF',
  markdown: 'Markdown',
  app: 'App',
  other: '其它',
};

/** 条目类型 → 中文名词：表格「类别」列与操作按钮 tooltip 共用同一份 */
export const ENTRY_KIND_LABELS = {
  folder: '文件夹',
  app: '应用',
  file: '文件',
} as const;

/** 展示形式（网格 / 表格）的存储键：刷新页面重新进入后保持上次切换到的形态 */
export const VIEW_MODE_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'view-mode',
);

/** 展示形式的编解码：只认 grid / table，写坏的存储值回落网格 */
export const VIEW_MODE_CODEC = createChoiceCodec<FilesViewMode>(
  ['grid', 'table'],
  'grid',
);

/**
 * 类型筛选下拉的选项（按上面的固定顺序）。
 * 是页面固定档位：不随当前目录里有没有该类型而增减。
 */
export const FILE_CATEGORY_OPTIONS = (
  Object.keys(FILE_CATEGORY_LABELS) as FileCategory[]
).map((value) => ({ value, label: FILE_CATEGORY_LABELS[value] }));

/**
 * 类型筛选的当前取值（`all` 或某一类），刷新后保留；没写过时按 `all`。
 * 键名带 `active`：旧的排除项数组含义不同，不能沿用同一个键。
 */
export const TYPE_FILTER_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'type-filter-active',
);

/** 类型筛选的「全部」档位与文案：列表固定排在最上面 */
export const TYPE_FILTER_ALL = 'all' as const;

export const TYPE_FILTER_ALL_LABEL = '全部';

/** 分类 → 瓦片图标；视频额外上蓝色，应用走通用应用图标，其余用通用弱色 */
export const CATEGORY_ICONS: Record<FileCategory, typeof IconFile> = {
  video: IconVideo,
  image: IconPhoto,
  pdf: IconFileText,
  markdown: IconMarkdown,
  app: IconApps,
  other: IconFile,
};

/**
 * 固定的系统应用程序目录入口：macOS 的系统应用装在根目录下的 `/Applications`，
 * 而用户主目录里可能也有一个同名 `Applications`（Chrome 应用快捷方式之类），打开后者
 * 会看不到任何应用。收藏面板顶部固定放这一条，随时一键回到真正的应用目录。
 */
export const SYSTEM_APPS_FAVORITE = {
  name: '系统应用程序',
  path: '/Applications',
} as const;
