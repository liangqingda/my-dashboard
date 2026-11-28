/**
 * 把一扇窗收进程序坞：页面弹窗、瓦片、`⌘M` 与 X / Esc 都走这一条。
 *
 * 两套口径：
 * - 页面弹窗：按当前内容的 id 找条目，有就更新快照，没有就新收一条（下次打开停在这一条）；
 * - 程序坞窗口：窗挂在哪颗图标上就回到哪颗（窗内翻篇只是临时换内容），
 *   条目的快照不动——图标对应的始终是它自己那份内容。
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
  /** 这扇窗现在挂着的图标条目（收起落点）；没有窗时传 null */
  ownerEntry: DockEntry | null;
  receiveEntry: (entry: DockEntry, sourceEl: HTMLElement | null) => void;
  sourceEl: HTMLElement | null;
  writeEntries: (next: DockEntry[]) => void;
};

export const minimizeDockWindow = ({
  beginClosing,
  current,
  descriptor,
  entries,
  ownerEntry,
  receiveEntry,
  sourceEl,
  writeEntries,
}: MinimizeDockWindowArgs) => {
  if (current?.phase === 'closing') {
    return;
  }

  /*
   * 程序坞窗口收起只回它挂着的图标：翻篇换来的内容不写回条目，
   * 下次点这颗图标仍然装出它自己那份内容（点它也是「装回」而不是「收起」）。
   */
  if (current !== null && descriptor.origin === 'dock') {
    beginClosing(
      { ...current, contentEntry: ownerEntry ?? current.entry },
      false,
      'minimize',
    );

    return;
  }

  const created = toDockEntry(descriptor, window.location.pathname, Date.now());
  const existing = entries.find((entry) => entry.id === descriptor.id);
  const target: DockEntry =
    existing === undefined
      ? created
      : { ...created, createdAt: existing.createdAt, page: existing.page };

  writeEntries(upsertDockEntry(entries, target));

  // 同一扇窗还开着（页面弹窗与它同一条）：复用窗实例收回去
  if (current !== null && current.entry.id === descriptor.id) {
    beginClosing(
      { ...current, contentEntry: current.entry },
      false,
      'minimize',
    );

    return;
  }

  receiveEntry(target, sourceEl);
};
