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
  /** 用内置预览打开被拖的图片 / 视频（手持卡片上的图标点一下就走这里） */
  onPreview?: (file: FileEntry) => void;
};
