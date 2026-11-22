/**
 * 文件浏览页的常量：存储键、占位文案与骨架形状。
 * 文件类型过滤住在中间件 `scripts/vite/files-store.ts`，前端不维护第二份。
 */

import { scopedStorageKey } from '@/utils/page-storage';

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

/** 目录路径输入框的占位文案 */
export const DIR_INPUT_PLACEHOLDER = '输入本地目录绝对路径，如 ~/Documents';

/** 目录路径输入框宽度 */
export const DIR_INPUT_WIDTH = 280;

/** 首屏骨架块的数量：只为给一个「正在读」的形状，不假装有数据 */
export const SKELETON_TILES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];
