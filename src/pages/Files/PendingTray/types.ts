import type { DraggableEntry } from '../types';

/** 待拖拽区的入参：条目本体 + 「整批拖」「收进拖来的条目」与清理三类动作 */
export type PendingTrayProps = {
  /** 已攒下的条目，顺序即加入顺序 */
  entries: DraggableEntry[];
  /** 列表正往这儿拖着东西：整块亮成落点，提示「松手就收进来」 */
  armed?: boolean;
  /**
   * 从这块区域拖起（除 header 外整块都是热区）：整批一起进移动弹窗。
   * 条目本身不可拖——想单独搬一条，去弹窗里的待拖拽区拖它那一行。
   */
  onDragAll: () => void;
  /** 拖拽结束（松手 / Esc），收掉拖拽状态 */
  onDragEnd: () => void;
  /** 从列表拖过来的条目在板上松手：按路径收进来（已在里面的跳过） */
  onDropPaths: (paths: string[]) => void;
  /** 点某一项就把它移出待拖拽区（带上那一格的矩形，动画据此飞回列表原位） */
  onRemove: (entry: DraggableEntry, from: DOMRect) => void;
  /** 整个清空 */
  onClear: () => void;
  /**
   * 移动弹窗开着时把它藏起来：弹窗铺满整屏，这条会浮在弹窗之上。
   * 只是藏起来、仍挂在 DOM 上——拖拽源被卸载会直接取消整次拖拽。
   */
  hidden?: boolean;
};
