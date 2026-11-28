/**
 * 程序坞恢复出来的窗口，header 计数改报程序坞条目，而不是窗内内容的翻篇计数。
 * 内容自己的方括号翻篇仍由 `useModalShortcuts` 管；左右方向键在这个窗口里归程序坞条目。
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

  return {
    disabled: context.entries.length < 2,
    index:
      Math.max(
        0,
        context.entries.findIndex((entry) => entry.id === dock.id),
      ) + 1,
    nextLabel: '下一个程序坞窗口',
    onNext: () => {
      context.stepWindow(1);
    },
    onPrevious: () => {
      context.stepWindow(-1);
    },
    previousLabel: '上一个程序坞窗口',
    shortcutHint: '← · →',
    total: context.entries.length,
  };
};
