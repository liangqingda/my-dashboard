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
import {
  DOCK_ENTRIES_STORAGE_KEY,
  DOCK_SETTINGS_STORAGE_KEY,
} from '../constants';
import { DockContext } from '../context';
import {
  DOCK_ENTRIES_CODEC,
  removeDockEntry,
  toDockEntry,
  upsertDockEntry,
} from '../utils/dock-entries';
import { flyWindowToDock } from '../utils/dock-fly';
import { DOCK_SETTINGS_CODEC, mergeDockSettings } from '../utils/dock-settings';
import { loadDockWindow } from '../windows/registry';
import type {
  DockContextValue,
  DockDescriptor,
  DockEntry,
  DockModalRegistration,
} from '../types';

type DockProviderProps = {
  children: ReactNode;
};

const DockProvider = ({ children }: DockProviderProps) => {
  const [settings, setStoredSettings] = useStoredState(
    DOCK_SETTINGS_STORAGE_KEY,
    DOCK_SETTINGS_CODEC,
  );
  const [entries, setStoredEntries] = useStoredState(
    DOCK_ENTRIES_STORAGE_KEY,
    DOCK_ENTRIES_CODEC,
  );
  const [revealed, setRevealed] = useState(!settings.autoHide);
  const [windowSlot, setWindowSlotState] = useState<DockWindowSlot | null>(null);

  const settingsRef = useRef(settings);
  const entriesRef = useRef(entries);
  const windowRef = useRef<DockWindowSlot | null>(windowSlot);
  const restoreSeq = useRef(0);
  const modalStack = useRef<DockModalRegistration[]>([]);

  // 事件里要读最新值、又不该在渲染阶段写 ref：提交后再同步
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-glass-strength',
      `${settings.glassOpacity}%`,
    );

    return () => {
      document.documentElement.style.removeProperty('--app-glass-strength');
    };
  }, [settings.glassOpacity]);

  const updateSettings = (patch: Partial<typeof settings>) => {
    const next = mergeDockSettings(settingsRef.current, patch);

    settingsRef.current = next;
    setStoredSettings(next);

    if (patch.autoHide !== undefined) {
      setRevealed(!next.autoHide);
    }
  };

  const showDock = () => setRevealed(true);

  const hideDock = () => {
    if (settingsRef.current.autoHide) {
      setRevealed(false);
    }
  };

  const toggleDock = () => {
    if (!settingsRef.current.autoHide) {
      return;
    }

    setRevealed((visible) => !visible);
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
        beginClosing(current, false);
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

    // 程序坞自己恢复出来的窗口再收起：让它当场缩回图标，条目保留（快照换成当前位置）
    if (current?.entry.id === descriptor.id) {
      const entry =
        descriptor.origin === 'dock'
          ? toDockEntry(descriptor, window.location.pathname, Date.now())
          : current.entry;

      if (descriptor.origin === 'dock') {
        writeEntries(upsertDockEntry(entriesRef.current, entry));
      }

      // 自动隐藏时也要先让程序坞露出来，收起动画才有落点可看
      setRevealed(true);
      beginClosing({ ...current, entry }, false);
      return;
    }

    const entry = toDockEntry(descriptor, window.location.pathname, Date.now());

    writeEntries(upsertDockEntry(entriesRef.current, entry));
    setRevealed(true);

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
