/**
 * 拖拽移动弹窗的 props：一次拖拽会话的全部状态与动作都在页面层的 `useDragMove` 里，
 * 这个组件只负责把「当前在哪一层、有哪些文件夹、取消区在哪」呈现出来。
 */

import type { useDragMove } from '../hooks/use-drag-move';

/** 弹窗入参 */
export type DragMoveModalProps = {
  /** 拖拽移动会话：包括弹窗开合、目录栈、悬停 / 弹起态与各落点动作 */
  dragMove: ReturnType<typeof useDragMove>;
};
