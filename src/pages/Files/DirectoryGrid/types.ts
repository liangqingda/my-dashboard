/**
 * 目录网格的 props。
 */

import type { DragEvent } from 'react';

import type { FileEntry, FolderEntry } from '../types';

/** 网格的入参 */
export type DirectoryGridProps = {
  /** 子文件夹 */
  folders: FolderEntry[];
  /** 直属文件（已按名称排序） */
  files: FileEntry[];
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频（交给视频预览弹窗） */
  onOpenVideo: (file: FileEntry) => void;
  /** 开始拖拽一条目 */
  onDragStartEntry: (path: string) => void;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽经过某文件夹（网格与表格共用同一套移动口径） */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目（弹窗改名） */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 请求删除某个条目（先弹二次确认） */
  onRequestDeleteEntry: (path: string) => void;
};
