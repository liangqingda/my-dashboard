/**
 * 程序坞窗口控制器：管理窗口槽、当前条目 id 与打开 / 收起 / 移除动作。
 * 条目存储仍由 Provider 持有，这里只读写传进来的引用，保证动画与状态同源。
 */

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { UseDockModalStackResult } from '../../hooks/useDockModalStack';
import type { DockWindowSlot } from '../../dock-window';
import type { DockEntry, DockEntryDraft } from '../../types';
import {
  createDockEntry,
  removeDockEntry,
  upsertDockEntry,
} from '../../utils/dock-entries';
import { flyWindowToDock } from '../../utils/dock-fly';
import { findDockSurface, slideWindowOut } from '../../utils/dock-motion';
import { slideDirectionOf } from '../../utils/dock-slide';
import {
  dockOwnerEntry,
  dockStepIndex,
} from '../../utils/dock-window-target';
import { restoreDockWindow } from '../restore-dock-window';

import { useDockWindowDisposal } from './useDockWindowDisposal';
import { useDockWindowOwner } from './useDockWindowOwner';

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
  const {
    adoptOwner,
    ownerId: windowOwnerId,
    ownerRef: windowOwnerIdRef,
    writeOwner: writeWindowOwner,
  } = useDockWindowOwner(entriesRef);

  const writeWindowEntry = (id: string | null) => {
    windowEntryIdRef.current = id;
    setWindowEntryIdState(id);
  };

  const reportWindowEntry = useCallback(
    (id: string | null) => {
      if (windowRef.current === null) {
        return;
      }

      windowEntryIdRef.current = id;
      setWindowEntryIdState(id);
      adoptOwner(id);
    },
    [adoptOwner],
  );

  const setWindow = (next: DockWindowSlot | null) => {
    windowRef.current = next;
    setWindowSlotState(next);

    if (next === null) {
      writeWindowEntry(null);
      writeWindowOwner(null);
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

  const ownerEntryOf = (slot: DockWindowSlot): DockEntry =>
    dockOwnerEntry(entriesRef.current, windowOwnerIdRef.current, slot.entry);

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
    const entry = createDockEntry(draft, window.location.pathname);

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
    writeWindowOwner(entry.id);

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
   * 窗内翻到程序坞外的内容后点回它挂着的图标：把这一条的快照重新装进这扇窗，不收起。
   * 换一个 `revision` 让宿主重挂窗口体；`entry` 同时换成这一条，窗的根节点与 key 跟着换，
   * 窗本身（槽位）不重建、也不跑开合动画。
   */
  const resetContent = (entry: DockEntry) => {
    const { current } = windowRef;

    if (current === null || current.phase === 'closing') {
      return;
    }

    // 先把「当前显示」改回它自己：图标那圈 hover 态当场消掉，等窗里重新上报同一条
    writeWindowEntry(entry.id);
    writeWindowOwner(entry.id);

    setWindow({
      ...current,
      animate: 'none',
      contentEntry: entry,
      entry,
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
      ownerIdRef: windowOwnerIdRef,
      resetContent,
      seq,
      windowRef,
    });
  };

  const stepWindow = (delta: -1 | 1): boolean => {
    const list = entriesRef.current;
    const index = dockStepIndex(
      list,
      windowEntryIdRef.current,
      windowOwnerIdRef.current,
    );

    if (index < 0 || list.length < 2) {
      return false;
    }

    const next = list[(index + delta + list.length) % list.length];

    restore(next.id);

    return true;
  };

  const { minimize, remove, requestCloseWindow } = useDockWindowDisposal({
    beginClosing,
    contentIdRef: windowEntryIdRef,
    entriesRef,
    ownerEntryOf,
    ownerIdRef: windowOwnerIdRef,
    receiveEntry,
    windowRef,
    writeEntries,
  });

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
    windowEntryId,
    windowOwnerId,
    windowSlot,
  };
};
