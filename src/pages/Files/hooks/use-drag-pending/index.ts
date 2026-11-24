import { useState } from 'react';

import type { DraggableEntry } from '../../types';

import type { DragPendingState, PendingFly } from './types';

/**
 * 待拖拽区的状态（交互与判定见同目录 `README.md`）。
 *
 * 只有一条规矩：**列表的点击语义跟着它变**——攒下东西以后，点条目是「加入 / 移除」，
 * 不再打开文件夹或弹预览；攒的东西整批交给 `useDragMove.open` 时才算一次移动会话。
 */
export const useDragPending = (): DragPendingState => {
  const [entries, setEntries] = useState<DraggableEntry[]>([]);
  /** 刚飞进来的那一条：起点矩形交给动画层，播完由它 clearFly */
  const [fly, setFly] = useState<PendingFly | null>(null);

  const has = (path: string) => entries.some((entry) => entry.path === path);

  const add = (entry: DraggableEntry) =>
    setEntries((prev) =>
      prev.some((item) => item.path === entry.path) ? prev : [...prev, entry],
    );

  const remove = (path: string) =>
    setEntries((prev) => prev.filter((entry) => entry.path !== path));

  const removePaths = (paths: string[]) =>
    setEntries((prev) => prev.filter((entry) => !paths.includes(entry.path)));

  const toggle = (entry: DraggableEntry, from?: DOMRect) => {
    if (has(entry.path)) {
      remove(entry.path);

      return;
    }

    // 加进去才播「挪到待拖拽区」的动画；移除是原地消失，不需要飞
    if (from !== undefined) {
      setFly({ entry, from });
    }

    add(entry);
  };

  const clear = () => {
    setEntries([]);
    setFly(null);
  };

  return {
    active: entries.length > 0,
    add,
    clear,
    clearFly: () => setFly(null),
    entries,
    fly,
    has,
    remove,
    removePaths,
    toggle,
  };
};
