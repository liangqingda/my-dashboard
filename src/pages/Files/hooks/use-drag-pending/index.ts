import { useState } from 'react';

import type { DraggableEntry } from '../../types';

import type { DragPendingState } from './types';

/**
 * 待拖拽区的状态（交互与判定见同目录 `README.md`）。
 *
 * 只有一条规矩：**列表的点击语义跟着它变**——攒下东西以后，点条目是「加入 / 移除」，
 * 不再打开文件夹或弹预览；攒的东西整批交给 `useDragMove.open` 时才算一次移动会话。
 */
export const useDragPending = (): DragPendingState => {
  const [entries, setEntries] = useState<DraggableEntry[]>([]);

  const has = (path: string) => entries.some((entry) => entry.path === path);

  const add = (entry: DraggableEntry) =>
    setEntries((prev) =>
      prev.some((item) => item.path === entry.path) ? prev : [...prev, entry],
    );

  const toggle = (entry: DraggableEntry) =>
    setEntries((prev) =>
      prev.some((item) => item.path === entry.path)
        ? prev.filter((item) => item.path !== entry.path)
        : [...prev, entry],
    );

  const remove = (path: string) =>
    setEntries((prev) => prev.filter((entry) => entry.path !== path));

  const clear = () => setEntries([]);

  return { active: entries.length > 0, add, clear, entries, has, remove, toggle };
};
