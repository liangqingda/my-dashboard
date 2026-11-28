/**
 * 程序坞窗口控制器：管理窗口槽、当前条目 id 与打开 / 收起 / 移除动作。
 * 条目存储仍由 Provider 持有，这里只读写传进来的引用，保证动画与状态同源。
 */

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { UseDockModalStackResult } from '../../hooks/useDockModalStack';
import type { DockWindowSlot } from '../../dock-window';
import { toDockEntry, upsertDockEntry, removeDockEntry } from '../../utils/dock-entries';
import { flyWindowToDock } from '../../utils/dock-fly';
import { minimizeDockWindow } from '../../utils/dock-minimize';
import { findDockSurface, slideWindowOut } from '../../utils/dock-motion';
import { slideDirectionOf } from '../../utils/dock-slide';
import { restoreDockWindow } from '../restore-dock-window';
import type {
  DockDescriptor,
  DockEntry,
  DockEntryDraft,
} from '../../types';

type Params = {
  entries: readonly DockEntry[];
  entriesRef: MutableRefObject<DockEntry[]>;
  modalStack: UseDockModalStackResult['modalStack'];
  writeEntries: (next: DockEntry[]) => void;
};

export const useDockWindowController = ({
  entries,
  entriesRef,
  modalStack,
  writeEntries,
}: Params) => {
  const [windowSlot, setWindowSlotState] = useState<DockWindowSlot | null>(null);
  /** 窗口当前展示的条目 id；翻篇后可能已不在程序坞里 */
  const [windowEntryId, setWindowEntryIdState] = useState<string | null>(null);
  const [receivingIds, setReceivingIds] = useState<readonly string[]>([]);
  const windowRef = useRef<DockWindowSlot | null>(windowSlot);
  const windowEntryIdRef = useRef<string | null>(windowEntryId);
  const restoreSeq = useRef(0);
  const receivingRef = useRef(new Set<string>());

  const writeWindowEntry = (id: string | null) => {
    windowEntryIdRef.current = id;
    setWindowEntryIdState(id);
  };

  const reportWindowEntry = useCallback((id: string | null) => {
    if (windowRef.current === null) {
      return;
    }

    windowEntryIdRef.current = id;
    setWindowEntryIdState(id);
  }, []);

  const setWindow = (next: DockWindowSlot | null) => {
    windowRef.current = next;
    setWindowSlotState(next);

    if (next === null) {
      writeWindowEntry(null);
    }
  };

  const markReceiving = (id: string) => {
    receivingRef.current.add(id);
    setReceivingIds([...receivingRef.current]);
  };

  const clearReceiving = (id: string) => {
    receivingRef.current.delete(id);
    setReceivingIds([...receivingRef.current]);
  };

  const receiveEntry = (entry: DockEntry, sourceEl: HTMLElement | null) => {
    if (sourceEl === null) {
      return;
    }

    markReceiving(entry.id);
    void flyWindowToDock(sourceEl, entry.id).finally(() => {
      clearReceiving(entry.id);
    });
  };

  const finishClosing = () => {
    const closing = windowRef.current;

    if (closing === null || closing.phase !== 'closing') {
      return;
    }

    if (closing.removeOnExit) {
      writeEntries(
        removeDockEntry(entriesRef.current, closing.removeId ?? closing.entry.id),
      );
    }

    clearReceiving(closing.contentEntry.id);
    setWindow(null);
  };

  const collect = (draft: DockEntryDraft, sourceEl?: HTMLElement | null) => {
    const entry = toDockEntry(draft, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    receiveEntry(entry, sourceEl ?? null);
  };

  const beginClosing = (
    slot: DockWindowSlot,
    removeOnExit: boolean,
    exit: 'minimize' | 'dismiss',
  ) => {
    if (slot.phase === 'closing') {
      return;
    }

    // 缩回图标前先占住虚位：程序坞收起时也会立即弹出，收坞动画才量得到最终落点
    if (exit === 'minimize') {
      markReceiving(slot.contentEntry.id);
    }

    setWindow({ ...slot, exit, phase: 'closing', removeOnExit });
  };

  /** 新窗：空场从图标中心长出；已有窗则按程序坞顺序整屏滑动切换，旧窗同时离场 */
  const activateEntry = (
    entry: DockEntry,
    Component: DockWindowSlot['Component'],
  ) => {
    writeWindowEntry(entry.id);

    const { current } = windowRef;

    if (current !== null) {
      if (current.phase === 'closing' || current.entry.id === entry.id) {
        return;
      }

      const direction = slideDirectionOf(
        entriesRef.current,
        current.entry.id,
        entry.id,
      );

      slideWindowOut(findDockSurface(current.entry.id), direction);
      setWindow({
        Component,
        animate: 'slide',
        contentEntry: entry,
        direction,
        entry,
        phase: 'opening',
        removeOnExit: false,
      });
      return;
    }

    setWindow({
      Component,
      animate: 'genie',
      contentEntry: entry,
      entry,
      phase: 'opening',
      removeOnExit: false,
    });
  };

  /**
   * 窗内翻到别的内容后点回它自己的图标：把这一条的快照重新装进这扇窗，不收起。
   * 换一个 `revision` 让宿主重挂窗口体，窗本身与根节点都不动。
   */
  const resetContent = () => {
    const { current } = windowRef;

    if (current === null || current.phase === 'closing') {
      return;
    }

    // 先把「当前显示」改回它自己：图标那圈弱激活当场消掉，等窗里重新上报同一条
    writeWindowEntry(current.entry.id);

    setWindow({
      ...current,
      animate: 'none',
      contentEntry: current.entry,
      phase: 'opening',
      removeOnExit: false,
      revision: (current.revision ?? 0) + 1,
    });
  };

  const restore = (id: string) => {
    const seq = restoreSeq.current + 1;

    restoreSeq.current = seq;

    restoreDockWindow({
      activateEntry,
      beginClosing,
      contentIdRef: windowEntryIdRef,
      entriesRef,
      id,
      currentSeq: () => restoreSeq.current,
      modalStack,
      resetContent,
      seq,
      windowRef,
    });
  };

  const stepWindow = (delta: -1 | 1): boolean => {
    const { current } = windowRef;
    const list = entriesRef.current;
    const reported = windowEntryIdRef.current;
    /*
     * 位置按当前内容找；窗内翻到一条没收录的内容时它不在列表里，
     * 退回这一窗自己的条目位置，`←` / `→` 才不会在这扇窗里失灵。
     */
    const id =
      reported !== null && list.some((entry) => entry.id === reported)
        ? reported
        : current?.entry.id;
    const index =
      id === undefined ? -1 : list.findIndex((entry) => entry.id === id);

    if (index < 0 || list.length < 2) {
      return false;
    }

    const next = list[(index + delta + list.length) % list.length];

    restore(next.id);

    return true;
  };

  const requestCloseWindow = () => {
    const { current } = windowRef;

    if (current === null) {
      return;
    }

    /*
     * 坞窗永远只回它自己的图标：窗内翻篇是临时状态，不碰任何条目。
     * 条目真的被删掉时走 `remove`，那条路径会直接把窗淡出。
     */
    beginClosing({ ...current, contentEntry: current.entry }, false, 'minimize');
  };

  const remove = (id: string) => {
    const { current } = windowRef;

    if (
      current !== null &&
      (current.entry.id === id || windowEntryIdRef.current === id)
    ) {
      if (current.phase === 'closing') {
        return;
      }

      beginClosing({ ...current, removeId: id }, true, 'dismiss');

      return;
    }

    writeEntries(removeDockEntry(entriesRef.current, id));
  };

  const minimize = (
    descriptor: DockDescriptor,
    sourceEl: HTMLElement | null,
  ) => {
    minimizeDockWindow({
      beginClosing,
      current: windowRef.current,
      descriptor,
      entries: entriesRef.current,
      receiveEntry,
      sourceEl,
      writeEntries,
    });
  };

  const shownEntryId =
    windowEntryId !== null &&
    entries.some((entry) => entry.id === windowEntryId)
      ? windowEntryId
      : null;

  return {
    activeEntryId: shownEntryId,
    collect,
    finishClosing,
    minimize,
    receivingIds,
    remove,
    reportWindowEntry,
    requestCloseWindow,
    restore,
    stepWindow,
    windowSlot,
  };
};
