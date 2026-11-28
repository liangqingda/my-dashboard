/**
 * 程序坞恢复出来的窗口：header 计数与 `←` / `→` 一律报程序坞条目，而不是窗内内容的翻篇。
 * 内容自己的方括号翻篇仍由 `useModalShortcuts` 管。
 *
 * 位置取值优先「窗里正在显示的那一条」，它没收录时退回「这扇窗自己的条目」——
 * 窗内翻篇是这扇窗临时换了内容，计数仍要报它是从哪颗图标开的。
 */

import { useDockOptional } from '@/dock/hooks/useDock';

import type { FreeModalDock, FreeModalNav } from '../types';

type DockNav = {
  /** `←` / `→` 的去向：程序坞窗口永远切程序坞条目 */
  arrowNav: FreeModalNav | undefined;
  /** header 上的计数与箭头 */
  headerNav: FreeModalNav | undefined;
};

export const useDockNav = (
  dock: FreeModalDock | undefined,
  nav: FreeModalNav | undefined,
): DockNav => {
  const context = useDockOptional();

  if (dock?.origin !== 'dock' || context === null || context.entries.length === 0) {
    return { arrowNav: undefined, headerNav: nav };
  }

  const { entries } = context;
  const shownIndex = entries.findIndex((entry) => entry.id === dock.id);
  const ownIndex = entries.findIndex(
    (entry) => entry.id === (dock.surfaceId ?? dock.id),
  );
  const index = shownIndex !== -1 ? shownIndex : ownIndex;
  const stepNav: FreeModalNav = {
    /* 两条都找不到时的占位：`arrowNav` 不显示计数，只有 `headerNav` 读它 */
    index: index === -1 ? 1 : index + 1,
    disabled: entries.length < 2,
    nextLabel: '下一个程序坞窗口',
    onNext: () => {
      context.stepWindow(1);
    },
    onPrevious: () => {
      context.stepWindow(-1);
    },
    previousLabel: '上一个程序坞窗口',
    shortcutHint: '← · →',
    total: entries.length,
  };

  return {
    arrowNav: stepNav,
    /* 两条都不在程序坞里（正在关窗）：没有可靠的格子可报，退回内容自己的翻篇 */
    headerNav: index === -1 ? nav : stepNav,
  };
};
