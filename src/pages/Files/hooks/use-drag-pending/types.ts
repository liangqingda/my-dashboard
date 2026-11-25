/**
 * 待拖拽区的状态：攒起来准备一起移动的那一批条目，外加「正从列表往这儿拖」的那一程。
 */

import type { DraggableEntry } from '../../types';

/** 一次「飞进待拖拽区」的动画：从哪个瓦片来（它的屏幕矩形） */
export type PendingFly = {
  /** 飞的是哪一条（按路径认，动画本身只画图标） */
  entry: DraggableEntry;
  /** 起点矩形：点选那一刻瓦片的位置 */
  from: DOMRect;
};

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
  /** 一次放进去一批（列表拖到待拖拽区松手时走它） */
  addMany: (entries: DraggableEntry[]) => void;
  /** 有就移除、没有就加入：列表里的点选走它；加进去时给个起点就播一记「飞过去」 */
  toggle: (entry: DraggableEntry, from?: DOMRect) => void;
  /** 正在飞的这一条；null 表示没有动画在跑 */
  fly: PendingFly | null;
  /** 动画播完（或没播成）时收掉它 */
  clearFly: () => void;
  /** 按路径移除（点这一项就移除） */
  remove: (path: string) => void;
  /** 批量移除：移动成功的条目从这里摘掉 */
  removePaths: (paths: string[]) => void;
  /** 清空 */
  clear: () => void;
  /**
   * 列表正往待拖拽区拖的那一批；非空时拖拽影像跟着指针走、待拖拽区整块亮成落点。
   * 这一程不开移动弹窗——松手落在待拖拽区就收进来，落在别处就当没拖。
   */
  trayDrag: DraggableEntry[] | null;
  /** 从列表起手往待拖拽区拖 */
  beginTrayDrag: (entries: DraggableEntry[]) => void;
  /** 那一程结束（松手 / Esc）：收起拖拽影像与落点高亮 */
  endTrayDrag: () => void;
};
