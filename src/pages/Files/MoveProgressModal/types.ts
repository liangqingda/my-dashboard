import type { MoveProgress } from '../hooks/use-drag-move/types';

/** 移动进度弹窗的入参：null 表示没在搬（弹窗收起） */
export type MoveProgressModalProps = {
  /** 正在搬的进度；null 时弹窗收起 */
  progress: MoveProgress | null;
};
