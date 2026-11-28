/** 程序坞应用级容器：条目存储、窗口控制器与 `⌘M` 栈；挂在 App 层，切页 / 刷新仍在 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import DockBar from '../dock-bar';
import DockWindowHost from '../dock-window';
import { DOCK_ENTRIES_STORAGE_KEY } from '../constants';
import { DockContext } from '../context';
import { useDockFullscreen } from '../hooks/useDockFullscreen';
import { useDockModalStack } from '../hooks/useDockModalStack';
import { DOCK_ENTRIES_CODEC } from '../utils/dock-entries';
import type { DockContextValue, DockEntry } from '../types';

import { useDockWindowController } from './hooks/useDockWindowController';

const DockProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setStoredEntries] = useStoredState(
    DOCK_ENTRIES_STORAGE_KEY,
    DOCK_ENTRIES_CODEC,
  );
  const { fullscreenCount, nativeFullscreen, reportFullscreen } =
    useDockFullscreen();
  const {
    activeEntryId: modalEntryId,
    modalStack,
    minimizeTop,
    registerModal,
  } = useDockModalStack(entries);

  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const writeEntries = (next: DockEntry[]) => {
    entriesRef.current = next;
    setStoredEntries(next);
  };

  const {
    activeEntryId: windowActiveEntryId,
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
  } = useDockWindowController({
    entries,
    entriesRef,
    modalStack,
    writeEntries,
  });

  /*
   * 页面里浮着的同一扇弹窗也算激活：有程序坞窗口时只看窗口当前条目，
   * 没有窗口时才落到弹窗登记栈；窗口翻到未收录内容时窗口侧返回 null。
   */
  const activeEntryId =
    windowSlot === null ? modalEntryId : windowActiveEntryId;

  const contextValue: DockContextValue = {
    activeEntryId,
    collect,
    entries,
    fullscreenCount,
    minimize,
    minimizeTop,
    nativeFullscreen,
    receivingIds,
    registerModal,
    remove,
    reportFullscreen,
    reportWindowEntry,
    requestCloseWindow,
    restore,
    stepWindow,
  };

  return (
    <DockContext.Provider value={contextValue}>
      {children}
      <DockBar />
      {windowSlot === null ? null : (
        <DockWindowHost
          onExited={finishClosing}
          onRequestClose={requestCloseWindow}
          slot={windowSlot}
        />
      )}
    </DockContext.Provider>
  );
};

export default DockProvider;
