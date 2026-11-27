/**
 * 程序坞的应用级容器：设置、收起条目、窗口编排与 `⌘M` 栈都在这里。
 *
 * 挂在 App 层（Router 内、布局外）：页面切走 / 刷新都还在；
 * 窗口本身由 `windows/*` 里的渲染器按快照重建，页面组件不参与恢复。
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import DockBar from '../dock-bar';
import DockWindowHost from '../dock-window';
import type { DockWindowSlot } from '../dock-window';
import {
  DOCK_ENTRIES_STORAGE_KEY,
  DOCK_MINIMIZE_DURATION,
  DOCK_SETTINGS_STORAGE_KEY,
  DOCK_SWITCH_LEAD_RATIO,
} from '../constants';
import { DockContext } from '../context';
import {
  DOCK_ENTRIES_CODEC,
  removeDockEntry,
  toDockEntry,
  upsertDockEntry,
} from '../utils/dock-entries';
import { dockReservedThickness } from '../utils/dock-layout';
import { flyWindowToDock } from '../utils/dock-motion';
import { DOCK_SETTINGS_CODEC, mergeDockSettings } from '../utils/dock-settings';
import { loadDockWindow } from '../windows/registry';
import type {
  DockContextValue,
  DockDescriptor,
  DockEntry,
  DockModalRegistration,
} from '../types';

/** 正在收回程序坞的窗口：条目留不留由这一次是否「关闭」决定 */
type ClosingSlot = DockWindowSlot & {
  removeOnExit: boolean;
};

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
  const [closingSlot, setClosingSlotState] = useState<ClosingSlot | null>(null);

  const settingsRef = useRef(settings);
  const entriesRef = useRef(entries);
  const windowRef = useRef<DockWindowSlot | null>(windowSlot);
  const closingRef = useRef<ClosingSlot | null>(closingSlot);
  const restoreSeq = useRef(0);
  const switchTimer = useRef<number | undefined>(undefined);
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

  const setClosing = (next: ClosingSlot | null) => {
    closingRef.current = next;
    setClosingSlotState(next);
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

  useEffect(
    () => () => {
      window.clearTimeout(switchTimer.current);
    },
    [],
  );

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

  /** 一扇窗刚开完 / 正在让位：先让它缩回去，再决定条目去留 */
  const finishClosing = () => {
    const closing = closingRef.current;

    if (closing === null) {
      return;
    }

    if (closing.removeOnExit) {
      writeEntries(removeDockEntry(entriesRef.current, closing.entry.id));
    }

    setClosing(null);
  };

  /** 打开一扇：已有窗口时先让它回坞，走到约 1/3 再放开新的一扇 */
  const activateEntry = (entry: DockEntry, Component: DockWindowSlot['Component']) => {
    const { current } = windowRef;

    window.clearTimeout(switchTimer.current);

    if (current !== null) {
      setClosing({ ...current, removeOnExit: false });
      setWindow(null);
      switchTimer.current = window.setTimeout(() => {
        setWindow({ Component, entry });
      }, DOCK_MINIMIZE_DURATION * DOCK_SWITCH_LEAD_RATIO);
      return;
    }

    setWindow({ Component, entry });
  };

  const restore = (id: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.id === id);

    if (
      entry === undefined ||
      windowRef.current?.entry.id === id ||
      closingRef.current !== null
    ) {
      return;
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

  const requestCloseWindow = () => {
    const { current } = windowRef;

    if (current === null) {
      return;
    }

    window.clearTimeout(switchTimer.current);
    setClosing({ ...current, removeOnExit: true });
    setWindow(null);
  };

  const minimize = (descriptor: DockDescriptor, sourceEl: HTMLElement | null) => {
    const { current } = windowRef;

    // 上一扇还在收尾：这一下点击不参与编排，免得新开与关闭抢同一批状态
    if (closingRef.current !== null) {
      return;
    }

    // 程序坞自己恢复出来的窗口再收起：让它自己缩回图标，条目保留（快照换成当前位置）
    if (current?.entry.id === descriptor.id) {
      const entry =
        descriptor.origin === 'dock'
          ? toDockEntry(descriptor, window.location.pathname, Date.now())
          : current.entry;

      if (descriptor.origin === 'dock') {
        writeEntries(upsertDockEntry(entriesRef.current, entry));
      }

      setClosing({ Component: current.Component, entry, removeOnExit: false });
      setWindow(null);
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
    entries,
    hideDock,
    minimize,
    minimizeTop,
    registerModal,
    requestCloseWindow,
    reservedThickness:
      entries.length > 0 && (!settings.autoHide || revealed)
        ? dockReservedThickness(settings.itemSize)
        : 0,
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
      {closingSlot === null ? null : (
        <DockWindowHost
          onExited={finishClosing}
          onRequestClose={requestCloseWindow}
          phase="closing"
          placement={settings.placement}
          slot={closingSlot}
        />
      )}
      {windowSlot === null ? null : (
        <DockWindowHost
          onExited={finishClosing}
          onRequestClose={requestCloseWindow}
          phase="opening"
          placement={settings.placement}
          slot={windowSlot}
        />
      )}
    </DockContext.Provider>
  );
};

export default DockProvider;
