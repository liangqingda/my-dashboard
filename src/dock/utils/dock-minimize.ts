/**
 * 把一扇窗收进程序坞：页面弹窗、瓦片、`⌘M` 与 X / Esc 都走这一条。
 *
 * 窗内翻篇后快照换了、窗口还是同一扇：按当前内容的 id 找条目，有就更新快照，
 * 没有就新收一条；图标跟当前内容走，不再固定沿用最初打开那一条。
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

  const created = toDockEntry(descriptor, window.location.pathname, Date.now());
  const existing = entries.find((entry) => entry.id === descriptor.id);

  /*
   * 同一扇程序坞窗口里翻篇 / 换图后，当前内容可能对应另一条条目：
   * 有就更新它的快照，没有就新收一条。窗口收起时缩回的是**当前内容**的图标，
   * 不再沿用最初打开那一条的 id，否则原图标会继续亮着、还替新内容兜底。
   */
  const target: DockEntry =
    existing === undefined
      ? created
      : { ...created, createdAt: existing.createdAt, page: existing.page };

  if (
    current !== null &&
    (descriptor.origin === 'dock' || current.entry.id === descriptor.id)
  ) {
    writeEntries(upsertDockEntry(entries, target));
    beginClosing({ ...current, entry: target }, false, 'minimize');

    return;
  }

  writeEntries(upsertDockEntry(entries, target));
  receiveEntry(target, sourceEl);
};
