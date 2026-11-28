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
    windowEntryId,
    windowOwnerId,
    windowSlot,
  } = useDockWindowController({
    entries,
    entriesRef,
    modalStack,
    writeEntries,
  });

  /*
   * 页面里浮着的同一扇弹窗也算激活：没有程序坞窗口时落到弹窗登记栈；
   * 有窗口时看窗口当前条目，翻到程序坞外的一条内容时退成窗挂着的那颗图标——
   * 窗还挂在它这儿，只是内容暂时不是它的。
   */
  const activeEntryId =
    windowSlot === null
      ? modalEntryId
      : windowActiveEntryId ?? windowOwnerId;
  /*
   * 窗里翻到一条程序坞里没有的内容：窗挂着的那颗图标在激活之上再叠一层 hover 态
   * （放大 + 图标阴影 + 「点击恢复」的 tip），提示点它能装回自己的内容；
   * 翻到的内容本身在程序坞时不算，那时它自己那颗图标是实心点。
   */
  const hoverEntryId =
    windowSlot !== null && windowEntryId !== null && windowActiveEntryId === null
      ? windowOwnerId
      : null;

  const contextValue: DockContextValue = {
    activeEntryId,
    collect,
    entries,
    fullscreenCount,
    hoverEntryId,
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
    windowOwnerId,
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
