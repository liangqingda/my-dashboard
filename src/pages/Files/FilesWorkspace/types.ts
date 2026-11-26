/**
 * 内容区那一行的入参：拖拽总接线 + 待拖拽区状态 + 「选择全部」，列表作为 `children` 排在行里。
 * 全屏状态不在这里传：本组件挂着时就在 `MenuContentLayout` 的 `children` 里，自己读外壳下发的那份。
 */

import type { ReactNode } from 'react';

import type { useDragPending } from '../hooks/use-drag-pending';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useFilesDrag } from '../hooks/useFilesDrag';

/** 内容区那一行的入参 */
export type FilesWorkspaceProps = {
  /** 列表那一列（面包屑 / 骨架 / 网格或表格），排在待拖拽区之后 */
  children: ReactNode;
  /** 拖拽总接线：整批起拖、从列表往待拖拽区收件都从这儿取 */
  drag: ReturnType<typeof useFilesDrag>;
  /** 待拖拽区状态：攒了哪些条目、是否正往这儿拖 */
  pending: ReturnType<typeof useDragPending>;
  /** 条目动作编排：拖拽层要读移动会话与「正在拖哪一批」 */
  entryActions: ReturnType<typeof useEntryActions>;
  /** 待拖拽区底部的「选择全部」：只收当前列表里看得见的那些 */
  onSelectAll: () => void;
};
