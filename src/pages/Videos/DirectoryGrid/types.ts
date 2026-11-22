/**
 * 目录网格的 props。
 */

import type { VideoFileEntry, VideoFolderEntry } from '../types';

/** 网格的入参 */
export type DirectoryGridProps = {
  /** 子文件夹（已按名称排序） */
  folders: VideoFolderEntry[];
  /** 直属视频文件（已按名称排序） */
  videos: VideoFileEntry[];
  /** 打开某个子文件夹 */
  onOpenFolder: (path: string) => void;
};
