/**
 * 拖拽移动弹窗的 props：一次拖拽会话的全部状态与动作都在页面层的 `useDragMove` 里，
 * 这个组件只负责把「当前在哪一层、有哪些文件夹」呈现出来；
 * 新建文件夹与预览这两件事页面才有上下文，由页面给动作。
 */

import type { useDragMove } from '../hooks/use-drag-move';
import type { FileEntry } from '../types';

/** 弹窗入参 */
export type DragMoveModalProps = {
  /** 拖拽移动会话：包括弹窗开合、当前层、悬停 / 弹起态与各落点动作 */
  dragMove: ReturnType<typeof useDragMove>;
  /** 在当前这一层新建文件夹（与目录页标题栏那颗按钮同一套流程：建完直接改名） */
  onCreateFolder: (dir: string) => void;
  /** 用内置预览打开被拖的图片 / 视频（弹窗待拖拽区里那一行的图标点一下就走这里） */
  onPreview?: (file: FileEntry) => void;
  /** 某个目录是否已收藏：弹窗 header 的收藏按钮按当前这一层取状态 */
  isFavorite: (path: string) => boolean;
  /** 收藏 / 取消收藏当前这一层（名字由路径末段推出） */
  onToggleFavorite: (path: string) => void;
  /** 选择本地目录（与标题栏那颗按钮同一套流程） */
  onPickDir: () => void;
};
