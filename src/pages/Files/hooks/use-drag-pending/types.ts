/**
 * 待拖拽区的状态：攒起来准备一起移动的那一批条目。
 */

import type { DraggableEntry } from '../../types';

/** 待拖拽区的状态与动作 */
export type DragPendingState = {
  /** 已经攒下的条目，顺序即加入顺序 */
  entries: DraggableEntry[];
  /** 有没有攒下东西（非空时列表的点击改成「加入 / 移除」，不再打开） */
  active: boolean;
  /** 某个路径是否已在里面（列表据此画选中态） */
  has: (path: string) => boolean;
  /** 放进去（已在里面就什么都不做） */
  add: (entry: DraggableEntry) => void;
  /** 有就移除、没有就加入：列表里的点选走它 */
  toggle: (entry: DraggableEntry) => void;
  /** 按路径移除（拖拽区里的叉号） */
  remove: (path: string) => void;
  /** 清空 */
  clear: () => void;
};
