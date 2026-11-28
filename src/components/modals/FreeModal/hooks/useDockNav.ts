/**
 * 程序坞恢复出来的窗口，header 计数改报程序坞条目，而不是窗内内容的翻篇计数。
 * 内容自己的方括号翻篇仍由 `useModalShortcuts` 管；左右方向键在这个窗口里归程序坞条目。
 *
 * 窗内翻到一条没收录的内容时（图标已经不亮），header 只能报内容自己的翻篇，
 * 但这一窗还是程序坞的窗，方向键照样切程序坞条目——提示里只留方括号，免得 tip 说谎。
 */

import { useDockOptional } from '@/dock/hooks/useDock';

import type { FreeModalDock, FreeModalNav } from '../types';

type DockNav = {
  /** ← / → 的去向：程序坞窗口永远切程序坞条目 */
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
  const index = entries.findIndex((entry) => entry.id === dock.id);
  const stepNav: FreeModalNav = {
    disabled: entries.length < 2,
    /* 位置未知时的占位：`arrowNav` 不显示计数，只有 `headerNav` 读它 */
    index: 1,
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

  // 窗内翻到未收录的内容：这一窗已经和程序坞条目脱钩，计数回到内容自己的翻篇
  if (index === -1) {
    return {
      arrowNav: stepNav,
      headerNav:
        nav === undefined ? undefined : { ...nav, shortcutHint: '[ · ]' },
    };
  }

  return { arrowNav: stepNav, headerNav: { ...stepNav, index: index + 1 } };
};
