/**
 * 文件夹瓦片的 props。
 */

import type { DragEvent } from 'react';

import type { FolderEntry } from '../types';

/** 网格里一条子文件夹的入参 */
export type FolderTileProps = {
  /** 文件夹摘要 */
  folder: FolderEntry;
  /** 打开这个文件夹 */
  onOpen: (path: string) => void;
  /** 当前正在被拖拽 */
  dragging?: boolean;
  /** 是当前拖拽的放置目标 */
  dropActive?: boolean;
  /** 开始拖拽本条 */
  onDragStartEntry?: () => void;
  /** 拖拽结束（松开 / 取消） */
  onDragEnd?: () => void;
  /** 拖拽经过本文件夹 */
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  /** 拖拽离开本文件夹 */
  onDragLeave?: () => void;
  /** 松手放入本文件夹 */
  onDrop?: () => void;
  /** 重命名这个文件夹 */
  onEdit?: () => void;
  /** 请求删除这个文件夹（先弹二次确认） */
  onRequestDelete?: () => void;
};
