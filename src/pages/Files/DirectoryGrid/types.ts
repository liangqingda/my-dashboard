/**
 * 目录网格的 props。
 */

import type { DragEvent } from 'react';

import type { FileEntry, FolderEntry } from '../types';

/** 网格的入参 */
export type DirectoryGridProps = {
  /** 子文件夹（改名中的条目排到最前） */
  folders: FolderEntry[];
  /** 直属文件（已按名称排序） */
  files: FileEntry[];
  /** 正在就地改名的文件夹路径；null 表示没有改名态 */
  renamingPath: string | null;
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 开始拖拽一条目 */
  onDragStartEntry: (path: string) => void;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽经过某文件夹 */
  onDragOverFolder: (path: string, event: DragEvent<HTMLDivElement>) => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 提交改名 */
  onRenameCommit: (path: string, name: string) => void;
  /** 取消改名 */
  onRenameCancel: () => void;
  /** 重命名某个文件夹（就地改名） */
  onEditFolder: (path: string) => void;
  /** 重命名某个文件（弹窗改名） */
  onEditFile: (file: FileEntry) => void;
  /** 请求删除某个条目（先弹二次确认） */
  onRequestDeleteEntry: (path: string) => void;
};
