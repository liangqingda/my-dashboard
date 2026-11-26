import { useCallback, useState } from 'react';

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
  /**
   * 正飞回列表的那一条：它还留在 `entries` 里，只是那一格改成虚位占着，
   * 等飞行落定（`clearFlight`）才真正摘掉——否则动画还在半路，格子已经先没了。
   */
  const [leaving, setLeaving] = useState<string | null>(null);
  /**
   * 连选的锚点：上一次点选的那一条。`Shift` + 点第 N 条时，从这里到第 N 条整段收进来
   * （macOS 访达的连选就是这个口径，锚点跟着「最后一次点」走）。
   */
  const [anchor, setAnchor] = useState<string | null>(null);

  const has = useCallback(
    (path: string) => entries.some((entry) => entry.path === path),
    [entries],
  );

  /* 锚点只由「点选」与「连选」改：`add` 也走这里（弹窗取回、拖进待拖拽区都算），别动它 */
  const add = useCallback((entry: DraggableEntry) => {
    setEntries((prev) =>
      prev.some((item) => item.path === entry.path) ? prev : [...prev, entry],
    );
  }, []);

  /** 一批里已存在的直接跳过，顺序仍按加入先后 */
  const addMany = useCallback((batch: DraggableEntry[]) => {
    setEntries((prev) => {
      const known = new Set(prev.map((item) => item.path));
      const incoming = batch.filter((entry) => !known.has(entry.path));

      return incoming.length === 0 ? prev : [...prev, ...incoming];
    });
  }, []);

  /**
   * 移出：给了待拖拽区那一格的矩形就播「飞回列表」——那一条先留在原处变成虚位，
   * 飞行落定后才摘掉；没给矩形（量不到那一格）就当场移除。
   */
  const remove = useCallback((entry: DraggableEntry, from?: DOMRect) => {
    if (from === undefined) {
      setEntries((prev) => prev.filter((item) => item.path !== entry.path));

      return;
    }

    setFlight({ direction: 'out', entry, from });
    setLeaving(entry.path);
  }, []);

  const removePaths = useCallback((paths: string[]) => {
    setLeaving(null);
    setEntries((prev) => prev.filter((entry) => !paths.includes(entry.path)));
  }, []);

  const toggle = useCallback(
    (entry: DraggableEntry, from?: DOMRect) => {
      setAnchor(entry.path);

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
    },
    [add, has, remove],
  );

  /**
   * 连选：把锚点到这一条之间（含两端）整段收进来，已在里面的跳过；顺序按列表顺序。
   * 还没有锚点（第一下就是 Shift + 点）时只收它自己，顺便把锚点落在它身上。
   */
  const selectRange = useCallback(
    (ordered: DraggableEntry[], path: string) => {
      const targetAt = ordered.findIndex((entry) => entry.path === path);

      if (targetAt === -1) {
        return;
      }

      const anchorAt = ordered.findIndex((entry) => entry.path === anchor);
      const from = anchorAt === -1 ? targetAt : Math.min(anchorAt, targetAt);
      const to = anchorAt === -1 ? targetAt : Math.max(anchorAt, targetAt);

      setAnchor(path);
      addMany(ordered.slice(from, to + 1));
    },
    [addMany, anchor],
  );

  const clear = useCallback(() => {
    setEntries([]);
    setFlight(null);
    setLeaving(null);
    setAnchor(null);
  }, []);

  const beginTrayDrag = useCallback((batch: DraggableEntry[]) => {
    setTrayDrag(batch);
  }, []);

  const endTrayDrag = useCallback(() => setTrayDrag(null), []);

  /** 飞行播完：进来的那条已经在 `entries` 里，出去的那条到这一刻才摘掉 */
  const clearFlight = useCallback(() => {
    if (leaving !== null) {
      const path = leaving;

      setEntries((prev) => prev.filter((item) => item.path !== path));
      setLeaving(null);
    }

    setFlight(null);
  }, [leaving]);

  return {
    active: entries.length > 0,
    add,
    addMany,
    beginTrayDrag,
    clear,
    clearFlight,
    endTrayDrag,
    entries,
    flight,
    has,
    leaving,
    remove,
    removePaths,
    selectRange,
    toggle,
    trayDrag,
  };
};
