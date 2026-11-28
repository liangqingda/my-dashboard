/**
 * 程序坞的应用级容器：设置、收起条目、窗口编排与 `⌘M` 栈都在这里。
 *
 * 挂在 App 层（Router 内、布局外）：页面切走 / 刷新都还在；
 * 窗口本身由 `windows/*` 里的渲染器按快照重建，页面组件不参与恢复。
 * 程序坞是悬浮层，不向页面要空间；同一时刻只展开一扇窗，换窗时原地过渡。
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import DockBar from '../dock-bar';
import DockWindowHost from '../dock-window';
import type { DockWindowSlot } from '../dock-window';
import { DOCK_ENTRIES_STORAGE_KEY } from '../constants';
import { DockContext } from '../context';
import { useDockSettings } from '../hooks/useDockSettings';
import {
  DOCK_ENTRIES_CODEC,
  removeDockEntry,
  toDockEntry,
  upsertDockEntry,
} from '../utils/dock-entries';
import { flyWindowToDock } from '../utils/dock-fly';
import { loadDockWindow } from '../windows/registry';
import type {
  DockContextValue,
  DockDescriptor,
  DockEntry,
  DockEntryDraft,
  DockModalRegistration,
} from '../types';

type DockProviderProps = {
  children: ReactNode;
};

const DockProvider = ({ children }: DockProviderProps) => {
  const {
    hideDock,
    revealed,
    settings,
    settingsRef,
    showDock,
    toggleDock,
    updateSettings,
  } = useDockSettings();
  const [entries, setStoredEntries] = useStoredState(
    DOCK_ENTRIES_STORAGE_KEY,
    DOCK_ENTRIES_CODEC,
  );
  const [windowSlot, setWindowSlotState] = useState<DockWindowSlot | null>(null);

  const entriesRef = useRef(entries);
  const windowRef = useRef<DockWindowSlot | null>(windowSlot);
  const restoreSeq = useRef(0);
  const modalStack = useRef<DockModalRegistration[]>([]);

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

  /** 收起动画结束时决定条目去留：关闭删条，最小化保留 */
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
  const collect = (draft: DockEntryDraft) => {
    const entry = toDockEntry(draft, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    showDock();
  };

  /** 当前这扇窗开始缩回程序坞；真正的卸载等动画结束 */
  const beginClosing = (slot: DockWindowSlot, removeOnExit: boolean) => {
    if (slot.phase === 'closing') {
      return;
    }

    setWindow({ ...slot, phase: 'closing', removeOnExit });
  };

  /**
   * 挂一扇新窗：当前没有窗口时从程序坞图标长出来；
   * 已经有另一扇时直接原地淡入切换，不再先回坞、再出来。
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

      setWindow({
        Component,
        animate: 'swap',
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
          beginClosing(current, false);
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

  /** X / Esc：先缩回图标，动画结束再删条目 */
  const requestCloseWindow = () => {
    const { current } = windowRef;

    if (current === null) {
      return;
    }

    beginClosing(current, true);
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

      // 自动隐藏时也要先让程序坞露出来，收起动画才有落点可看
      showDock();
      beginClosing({ ...current, entry }, false);
      return;
    }

    const entry = toDockEntry(descriptor, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    showDock();

    if (sourceEl !== null) {
      void flyWindowToDock(sourceEl, entry.id, settingsRef.current.placement);
    }
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
    hideDock,
    minimize,
    minimizeTop,
    registerModal,
    requestCloseWindow,
    restore,
    revealed,
    settings,
    showDock,
    toggleDock,
    updateSettings,
  };

  return (
    <DockContext.Provider value={contextValue}>
      {children}
      <DockBar />
      {windowSlot === null ? null : (
        <DockWindowHost
          onExited={finishClosing}
          onRequestClose={requestCloseWindow}
          placement={settings.placement}
          slot={windowSlot}
        />
      )}
    </DockContext.Provider>
  );
};

export default DockProvider;
