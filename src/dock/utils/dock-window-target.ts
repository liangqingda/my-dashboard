/**
 * 坞窗的「作用对象」：它挂在哪颗图标上、`←` / `→` 从第几格起跳。
 *
 * 窗内翻到程序坞外的内容后，窗仍算挂在原来那颗图标上（`ownerId`），
 * 所以收起落点、图标激活与切换格位都先看当前内容有没有收录，再退回这颗图标。
 */

import type { DockEntry } from '../types';

/** 窗挂着的那颗图标条目；条目刚被删掉时退回窗口自己那一条 */
export const dockOwnerEntry = (
  entries: readonly DockEntry[],
  ownerId: string | null,
  fallback: DockEntry,
): DockEntry => entries.find((entry) => entry.id === ownerId) ?? fallback;

/**
 * `←` / `→` 的起跳格位：窗里正显示的那条在程序坞里就用它，
 * 否则退回窗挂着的图标（翻到程序坞外内容时按图标位置切换），都没有返回 `-1`。
 */
export const dockStepIndex = (
  entries: readonly DockEntry[],
  shownId: string | null,
  ownerId: string | null,
): number => {
  const id =
    shownId !== null && entries.some((entry) => entry.id === shownId)
      ? shownId
      : ownerId;

  return id === null ? -1 : entries.findIndex((entry) => entry.id === id);
};
