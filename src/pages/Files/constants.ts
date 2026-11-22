/**
 * 文件浏览页的常量：存储键、占位文案、分类档位与骨架形状。
 * 文件归类（扩展名 → 分类）住在中间件 `scripts/vite/files-store.ts`，前端只消费分类键，
 * 不维护第二份扩展名表；分类的中文标签与筛选偏好归本页。
 */

import { scopedStorageKey } from '@/utils/page-storage';

import type { FileCategory } from './types';

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

/** 首屏骨架块的数量：只为给一个「正在读」的形状，不假装有数据 */
export const SKELETON_TILES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** 分类键 → 中文标签；键的集合与中间件 `FileCategory` 对齐 */
export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  video: '视频',
  pdf: 'PDF',
  markdown: 'Markdown',
  other: '其它',
};

/** 类型筛选下拉的选项（按上面的固定顺序） */
export const FILE_CATEGORY_OPTIONS = (
  Object.keys(FILE_CATEGORY_LABELS) as FileCategory[]
).map((value) => ({ value, label: FILE_CATEGORY_LABELS[value] }));

/** 类型筛选的已选分类（多选，刷新后保留；空数组表示不过滤） */
export const TYPE_FILTER_STORAGE_KEY = scopedStorageKey(
  FILES_STORAGE_SCOPE,
  'type-filter',
);

/** 类型筛选下拉宽度（两项 pill 收进 +n 后仍单行放得下） */
export const TYPE_FILTER_WIDTH = 176;

/** 收藏目录下拉宽度 */
export const FAVORITE_SELECT_WIDTH = 200;

/** 类型多选最多平铺展示的已选项；超出收进「+n」，悬浮看剩余 */
export const MAX_VISIBLE_CATEGORY_PILLS = 2;
