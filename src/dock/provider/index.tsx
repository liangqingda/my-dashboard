/** 程序坞应用级容器：条目、窗口编排与 `⌘M` 栈；挂在 App 层，切页 / 刷新仍在 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import DockBar from '../dock-bar';
import DockWindowHost from '../dock-window';
import type { DockWindowSlot } from '../dock-window';
import { DOCK_ENTRIES_STORAGE_KEY } from '../constants';
import { DockContext } from '../context';
import {
  DOCK_ENTRIES_CODEC,
  removeDockEntry,
  toDockEntry,
  upsertDockEntry,
} from '../utils/dock-entries';
import { flyWindowToDock } from '../utils/dock-fly';
import { minimizeDockWindow } from '../utils/dock-minimize';
import { findDockSurface, slideWindowOut } from '../utils/dock-motion';
import { slideDirectionOf } from '../utils/dock-slide';
import { loadDockWindow } from '../windows/registry';
import type {
  DockContextValue,
  DockDescriptor,
  DockEntry,
  DockEntryDraft,
  DockModalRegistration,
} from '../types';

const DockProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setStoredEntries] = useStoredState(
    DOCK_ENTRIES_STORAGE_KEY,
    DOCK_ENTRIES_CODEC,
  );
  const [windowSlot, setWindowSlotState] = useState<DockWindowSlot | null>(null);
  const [receivingIds, setReceivingIds] = useState<readonly string[]>([]);

  const entriesRef = useRef(entries);
  const windowRef = useRef<DockWindowSlot | null>(windowSlot);
  const restoreSeq = useRef(0);
  const modalStack = useRef<DockModalRegistration[]>([]);
  const receivingRef = useRef(new Set<string>());

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const setWindow = (next: DockWindowSlot | null) => {
    windowRef.current = next;
    setWindowSlotState(next);
  };

  const writeEntries = (next: DockEntry[]) => {
    entriesRef.current = next;
    setStoredEntries(next);
  };

  /** 飞入期间画虚位、藏图标；飞完图标由小长出来 */
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
      writeEntries(removeDockEntry(entriesRef.current, closing.entry.id));
    }

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

    setWindow({ ...slot, exit, phase: 'closing', removeOnExit });
  };

  /** 新窗：空场从图标中心长出；已有窗则按程序坞顺序整屏滑动切换，旧窗同时离场 */
  const activateEntry = (
    entry: DockEntry,
    Component: DockWindowSlot['Component'],
  ) => {
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
      entry,
      phase: 'opening',
      removeOnExit: false,
    });
  };

  const restore = (id: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.id === id);

    if (entry === undefined) {
      return;
    }

    const { current } = windowRef;

    if (current !== null) {
      if (current.phase === 'closing') {
        return;
      }

      if (current.entry.id === id) {
        // 走登记的收起动作：翻篇后的最新快照只有这一窗的描述符知道
        const registration = modalStack.current.find((candidate) => candidate.id === id);

        if (registration !== undefined) {
          registration.minimize();
        } else {
          beginClosing(current, false, 'minimize');
        }

        return;
      }
    }

    const seq = restoreSeq.current + 1;

    restoreSeq.current = seq;

    void loadDockWindow(entry.kind).then((Component) => {
      if (restoreSeq.current !== seq) {
        return;
      }

      activateEntry(entry, Component);
    });
  };

  const stepWindow = (delta: -1 | 1): boolean => {
    const { current } = windowRef;
    const list = entriesRef.current;
    const id = current?.entry.id;
    const index = id === undefined ? -1 : list.findIndex((entry) => entry.id === id);

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

    beginClosing(current, false, 'minimize');
  };

  const remove = (id: string) => {
    const { current } = windowRef;

    if (current !== null && current.entry.id === id) {
      if (current.phase === 'closing') {
        return;
      }

      beginClosing(current, true, 'dismiss');

      return;
    }

    writeEntries(removeDockEntry(entriesRef.current, id));
  };

  const minimize = (descriptor: DockDescriptor, sourceEl: HTMLElement | null) => {
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

  const registerModal = (registration: DockModalRegistration) => {
    modalStack.current = [...modalStack.current, registration];

    return () => {
      modalStack.current = modalStack.current.filter(
        (candidate) => candidate !== registration,
      );
    };
  };

  const minimizeTop = () => {
    const last = modalStack.current.at(-1);

    if (last === undefined) {
      return false;
    }

    last.minimize();

    return true;
  };

  const contextValue: DockContextValue = {
    activeEntryId: windowSlot === null ? null : windowSlot.entry.id,
    collect,
    entries,
    minimize,
    minimizeTop,
    receivingIds,
    registerModal,
    remove,
    requestCloseWindow,
    restore,
    stepWindow,
  };

  return (
    <DockContext.Provider value={contextValue}>
      {children}
      <DockBar />
      {windowSlot === null ? null : (
        <DockWindowHost onExited={finishClosing} onRequestClose={requestCloseWindow} slot={windowSlot} />
      )}
    </DockContext.Provider>
  );
};

export default DockProvider;
