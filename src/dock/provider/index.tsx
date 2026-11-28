/**
 * 程序坞的应用级容器：收起条目、窗口编排与 `⌘M` 栈都在这里。
 *
 * 挂在 App 层（Router 内、布局外）：页面切走 / 刷新都还在；
 * 窗口本身由 `windows/*` 里的渲染器按快照重建，页面组件不参与恢复。
 * 程序坞固定悬浮在底部，同一时刻只展开一扇窗；换窗按程序坞顺序左右滑动。
 */

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

  /** 飞入期间让程序坞画虚位、藏住图标；飞完再让图标由小长出来 */
  const markReceiving = (id: string) => {
    receivingRef.current.add(id);
    setReceivingIds([...receivingRef.current]);
  };

  const clearReceiving = (id: string) => {
    receivingRef.current.delete(id);
    setReceivingIds([...receivingRef.current]);
  };

  /** 页面弹窗 / 瓦片收进程序坞：条目先落位成虚位，再飞进去 */
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

  /** 不经过页面弹窗，直接把一条快照收进程序坞（瓦片按钮用） */
  const collect = (draft: DockEntryDraft, sourceEl?: HTMLElement | null) => {
    const entry = toDockEntry(draft, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    receiveEntry(entry, sourceEl ?? null);
  };

  /** 当前这扇窗开始退出；真正的卸载等动画结束 */
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

  /**
   * 挂一扇新窗：没有窗口时从图标中心长出来；已有另一扇时按程序坞顺序整屏滑动切换，
   * 旧窗向左 / 右滑出、新窗从另一侧滑入，不再淡入淡出。
   */
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

  /** 点程序坞图标：已经展开着就收起，没展开就恢复 */
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

  /** `⌘←` / `⌘→`：按程序坞顺序切上一条 / 下一条 */
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

  /** X / Esc：不缩回程序坞，按弹窗默认淡出；动画结束再删条目 */
  const requestCloseWindow = () => {
    const { current } = windowRef;

    if (current === null) {
      return;
    }

    beginClosing(current, true, 'dismiss');
  };

  const minimize = (descriptor: DockDescriptor, sourceEl: HTMLElement | null) => {
    const { current } = windowRef;

    if (current?.phase === 'closing') {
      return;
    }

    /*
     * 程序坞自己恢复出来的窗口再收起：图片 / 视频能在窗内翻篇，窗口还是这一扇，
     * 但快照已经换了。除了 id，再按 origin + kind 兜底认窗；条目 id 保持稳定，
     * 只换快照与标题，图标不会因为翻页多出一条。
     */
    const isDockWindow =
      descriptor.origin === 'dock' && current?.entry.kind === descriptor.kind;

    if (current !== null && (current.entry.id === descriptor.id || isDockWindow)) {
      const entry = isDockWindow
        ? {
            ...toDockEntry(descriptor, window.location.pathname, Date.now()),
            createdAt: current.entry.createdAt,
            id: current.entry.id,
            page: current.entry.page,
          }
        : current.entry;

      if (isDockWindow) {
        writeEntries(upsertDockEntry(entriesRef.current, entry));
      }

      beginClosing({ ...current, entry }, false, 'minimize');
      return;
    }

    const entry = toDockEntry(descriptor, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    receiveEntry(entry, sourceEl);
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
