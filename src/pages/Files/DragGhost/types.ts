import type { DraggableEntry } from '../types';

/** 拖拽影像的入参 */
export type DragGhostProps = {
  /** 正在拖的条目：一个或多个，多于三层只画三层 */
  entries: DraggableEntry[];
  /**
   * 要不要在左上角标数量。往待拖拽区拖的那一程不标：
   * 那一趟只是「把列表里的条目挪到板上」，还没进入移动，数字会喧宾夺主。
   */
  showCount?: boolean;
};
