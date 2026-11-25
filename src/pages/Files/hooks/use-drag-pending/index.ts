import { useState } from 'react';

import type { DraggableEntry } from '../../types';
import { pendingChipRect } from '../../utils/pending-dom';

import type { DragPendingState, PendingFlight } from './types';

/**
 * 待拖拽区的状态（交互与判定见同目录 `README.md`）。
 *
 * 两条规矩：
 * - **列表的点击语义跟着它变**——攒下东西以后，点条目是「加入 / 移除」，不再打开文件夹或弹预览；
 * - **攒下东西以后拖拽也不直接开弹窗**——先在列表里拖，落到侧栏待拖拽区才收进来（`trayDrag`），
 *   要搬的时候从待拖拽区整块拖起（那一程才开移动弹窗）。
 */
export const useDragPending = (): DragPendingState => {
  const [entries, setEntries] = useState<DraggableEntry[]>([]);
  /** 刚飞的那一条：矩形交给动画层，播完由它 clearFlight */
  const [flight, setFlight] = useState<PendingFlight | null>(null);
  /** 列表正往待拖拽区拖的一批；null 表示没有这一程 */
  const [trayDrag, setTrayDrag] = useState<DraggableEntry[] | null>(null);

  const has = (path: string) => entries.some((entry) => entry.path === path);

  const add = (entry: DraggableEntry) =>
    setEntries((prev) =>
      prev.some((item) => item.path === entry.path) ? prev : [...prev, entry],
    );

  /** 一批里已存在的直接跳过，顺序仍按加入先后 */
  const addMany = (batch: DraggableEntry[]) =>
    setEntries((prev) => {
      const known = new Set(prev.map((item) => item.path));
      const incoming = batch.filter((entry) => !known.has(entry.path));

      return incoming.length === 0 ? prev : [...prev, ...incoming];
    });

  /** 移出：给了待拖拽区那一格的矩形就播「飞回列表」，否则原地消失 */
  const remove = (entry: DraggableEntry, from?: DOMRect) => {
    if (from !== undefined) {
      setFlight({ direction: 'out', entry, from });
    }

    setEntries((prev) => prev.filter((item) => item.path !== entry.path));
  };

  const removePaths = (paths: string[]) =>
    setEntries((prev) => prev.filter((entry) => !paths.includes(entry.path)));

  const toggle = (entry: DraggableEntry, from?: DOMRect) => {
    if (has(entry.path)) {
      // 取消：从待拖拽区那一格起飞，飞回列表里被点的那张瓦片（量不到就不播）
      const chip = pendingChipRect(entry.path);

      remove(entry, chip ?? undefined);

      return;
    }

    // 加进去才播「挪到待拖拽区」的动画；移除走 `remove` 那条（它自己带矩形）
    if (from !== undefined) {
      setFlight({ direction: 'in', entry, from });
    }

    add(entry);
  };

  const clear = () => {
    setEntries([]);
    setFlight(null);
  };

  return {
    active: entries.length > 0,
    add,
    addMany,
    beginTrayDrag: (batch) => setTrayDrag(batch),
    clear,
    clearFlight: () => setFlight(null),
    endTrayDrag: () => setTrayDrag(null),
    entries,
    flight,
    has,
    remove,
    removePaths,
    toggle,
    trayDrag,
  };
};
