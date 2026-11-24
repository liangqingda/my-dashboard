import type { DraggableEntry } from '../types';

/** 待拖拽区的入参：条目本体 + 「整批拖 / 拖单个」与清理三类动作 */
export type PendingTrayProps = {
  /** 已攒下的条目，顺序即加入顺序 */
  entries: DraggableEntry[];
  /** 从这块空白处拖起：整批一起进移动弹窗 */
  onDragAll: () => void;
  /** 从某个小图标拖起：只搬它一个 */
  onDragEntry: (entry: DraggableEntry) => void;
  /** 拖拽结束（松手 / Esc），收掉拖拽状态 */
  onDragEnd: () => void;
  /** 从待拖拽区移除某一项（小图标右上角的叉号） */
  onRemove: (path: string) => void;
  /** 整个清空 */
  onClear: () => void;
  /**
   * 移动弹窗开着时把它藏起来：弹窗铺满整屏，这条横条会浮在弹窗之上。
   * 只是藏起来、仍挂在 DOM 上——拖拽源被卸载会直接取消整次拖拽。
   */
  hidden?: boolean;
};
