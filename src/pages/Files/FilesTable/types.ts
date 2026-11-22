/**
 * 表格平铺视图的 props。
 */

import type { DragEvent } from 'react';

import type { FileEntry, FilesRow, FolderEntry } from '../types';

/** 表格的入参：数据与事件都与网格一致，只是换一种排布 */
export type FilesTableProps = {
  /** 筛选后的行：文件夹在前、文件在后（见 `toFilesRows`） */
  rows: FilesRow[];
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 打开某个子文件夹（点名称进入下一层） */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频（点名称交给视频预览弹窗） */
  onOpenVideo: (file: FileEntry) => void;
  /** 开始拖拽一条目 */
  onDragStartEntry: (path: string) => void;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽经过某文件夹 */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: () => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目（弹窗改名） */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 请求删除某个条目（先弹二次确认） */
  onRequestDeleteEntry: (path: string) => void;
};
