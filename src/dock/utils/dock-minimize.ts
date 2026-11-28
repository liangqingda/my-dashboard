/**
 * 把一扇窗收进程序坞：页面弹窗、瓦片、`⌘M` 与 X / Esc 都走这一条。
 *
 * 窗内翻篇后快照换了、窗口还是同一扇，所以除 id 再用 origin + kind 兜底认窗；
 * 条目 id 保持稳定，只换快照与标题，图标不会因为翻页多出一条。
 */

import type { DockWindowSlot } from '../dock-window';
import type { DockDescriptor, DockEntry } from '../types';

import { toDockEntry, upsertDockEntry } from './dock-entries';

type MinimizeDockWindowArgs = {
  beginClosing: (
    slot: DockWindowSlot,
    removeOnExit: boolean,
    exit: 'minimize' | 'dismiss',
  ) => void;
  current: DockWindowSlot | null;
  descriptor: DockDescriptor;
  entries: DockEntry[];
  receiveEntry: (entry: DockEntry, sourceEl: HTMLElement | null) => void;
  sourceEl: HTMLElement | null;
  writeEntries: (next: DockEntry[]) => void;
};

export const minimizeDockWindow = ({
  beginClosing,
  current,
  descriptor,
  entries,
  receiveEntry,
  sourceEl,
  writeEntries,
}: MinimizeDockWindowArgs) => {
  if (current?.phase === 'closing') {
    return;
  }

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
      writeEntries(upsertDockEntry(entries, entry));
    }

    beginClosing({ ...current, entry }, false, 'minimize');

    return;
  }

  const entry = toDockEntry(descriptor, window.location.pathname, Date.now());

  writeEntries(upsertDockEntry(entries, entry));
  receiveEntry(entry, sourceEl);
};
