/**
 * 目录网格的 props。
 */

import type { FileEntry, FolderEntry } from '../types';

/** 网格的入参 */
export type DirectoryGridProps = {
  /** 子文件夹（已按名称排序） */
  folders: FolderEntry[];
  /** 直属文件（已按名称排序） */
  files: FileEntry[];
  /** 打开某个子文件夹 */
  onOpenFolder: (path: string) => void;
};
