import type { DraggableEntry } from '../types';

/** 待拖拽区的入参：条目本体 + 「整批拖」「收进拖来的条目」与清理三类动作 */
export type PendingTrayProps = {
  /** 已攒下的条目，顺序即加入顺序 */
  entries: DraggableEntry[];
  /** 列表正往这儿拖着东西：整块亮成落点，提示「松手就收进来」 */
  armed?: boolean;
  /**
   * 底部的「拖拽全部」：整批一起进移动弹窗。
   * 面板本身不再是拖拽热区——想整批搬，只能按这颗按钮；单条搬到弹窗里再拖。
   */
  onDragAll: () => void;
  /**
   * 「拖拽全部」不可用：直接拖模式下当前这一层没有文件夹，整批拖出去没有落点。
   * 此时按钮画成禁用态，也不再作为拖拽源。
   */
  dragAllDisabled?: boolean;
  /** 拖拽结束（松手 / Esc），收掉拖拽状态 */
  onDragEnd: () => void;
  /** 从列表拖过来的条目在板上松手：按路径收进来（已在里面的跳过） */
  onDropPaths: (paths: string[]) => void;
  /** 点某一项就把它移出待拖拽区（带上那一格的矩形，动画据此飞回列表原位） */
  onRemove: (entry: DraggableEntry, from: DOMRect) => void;
  /** 整个清空（底部的「取消」） */
  onClear: () => void;
  /** 底部的「选择全部」：当前列表里的所有条目一次收进来 */
  onSelectAll: () => void;
  /**
   * 正上下飞的那一条（进 / 出都算）：它那一格先收成**虚位**——虚线框、透明底、内容不显形、
   * 不响应指针，位子与尺寸都占住。进来时落定后内容由小到大长出；出去时等飞行落定才整格摘掉，
   * 而不是动画刚起手格子就没了。
   */
  placeholderPath?: string | null;
  /**
   * 移动弹窗开着时把它藏起来：弹窗铺满整屏，这条会浮在弹窗之上。
   * 只是藏起来、仍挂在 DOM 上——拖拽源被卸载会直接取消整次拖拽。
   */
  hidden?: boolean;
  /**
   * 全屏：页面根铺满视口、侧栏不在眼前，这块改成**内容区左侧的一列**——参与排布、
   * 把列表挤到右边、高度撑满内容区，不再浮在列表上。
   * 由页面读 `usePageFullscreen()` 递进来（见 `MenuContentLayout` 的导出）。
   */
  inline?: boolean;
  /**
   * 没有条目（整块收起）。面板常挂 DOM，靠这个类做过渡：
   * 清空 / 取消时就是「滑出 + 淡出」的退场动画，而不是瞬间消失。
   */
  closed?: boolean;
};
