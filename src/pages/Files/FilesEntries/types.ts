/**
 * 列表区的 props：数据由页面筛好，事件全部是页面 / hook 里已有的回调，这里只负责排布。
 */

import type { DragEvent } from 'react';

import type { AppEntry, FileEntry, FilesRow, FolderEntry } from '../types';

/** 列表区入参：网格与表格共用同一套数据与事件 */
export type FilesEntriesProps = {
  /** 筛完的应用包 */
  apps: AppEntry[];
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 筛完的文件 */
  files: FileEntry[];
  /** 筛完的子文件夹 */
  folders: FolderEntry[];
  /** 网格 / 表格 */
  isGridView: boolean;
  /** 表格视图的行（文件夹 → 应用 → 文件） */
  rows: FilesRow[];
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 拖拽经过某文件夹 */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 开始拖拽一条目 */
  onDragStartEntry: (path: string) => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目 */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频 */
  onOpenVideo: (file: FileEntry) => void;
  /** 请求删除某个条目 */
  onRequestDeleteEntry: (path: string) => void;
  /** 请求卸载某个应用 */
  onRequestUninstallApp: (app: AppEntry) => void;
};
