/**
 * 程序坞恢复出来的窗口，header 计数改报程序坞条目，而不是窗内内容的翻篇计数。
 * 内容自己的方括号 / 方向键翻篇仍由 `useModalShortcuts` 管；这两颗箭头只切程序坞条目，
 * 键盘切窗走 `⌘←` / `⌘→`（`layouts/BasicLayout`），不抢内容的方向键（视频快进照旧）。
 */

import { useDockOptional } from '@/dock/hooks/useDock';

import type { FreeModalDock, FreeModalNav } from '../types';

export const useDockNav = (
  dock: FreeModalDock | undefined,
  nav: FreeModalNav | undefined,
): FreeModalNav | undefined => {
  const context = useDockOptional();

  if (dock?.origin !== 'dock' || context === null || context.entries.length === 0) {
    return nav;
  }

  const index = context.entries.findIndex((entry) => entry.id === dock.id);

  // 窗内翻到未收录的内容：这一窗已经和程序坞条目脱钩，header 计数回到内容自己的翻篇
  if (index === -1) {
    return nav;
  }

  return {
    disabled: context.entries.length < 2,
    index: index + 1,
    nextLabel: '下一个程序坞窗口',
    onNext: () => {
      context.stepWindow(1);
    },
    onPrevious: () => {
      context.stepWindow(-1);
    },
    previousLabel: '上一个程序坞窗口',
    shortcutHint: '⌘← · ⌘→',
    total: context.entries.length,
  };
};
