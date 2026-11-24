import type { DraggableEntry } from '../types';

/** 拖拽影像的入参 */
export type DragGhostProps = {
  /** 正在拖的条目：一个或多个，多于三层只画三层，数量另有红点标 */
  entries: DraggableEntry[];
};
