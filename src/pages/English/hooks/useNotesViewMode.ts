/**
 * 列表展示形式：分列看板 ⇄ 表格平铺。
 *
 * 两件事都收在这里：
 * - 选中的形态记在 localStorage，刷新页面重新进入后保持上次的样子；
 * - 已经挂载过的形态留在 `mounted` 里，切回去只切显隐——几百个条目整棵拆掉重建
 *   是一笔实打实的开销，来回切两次就付两次。
 */

import { useState } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import type { NotesViewMode, UseNotesViewModeResult } from '../types';
import { VIEW_MODE_CODEC, VIEW_MODE_STORAGE_KEY } from '../constants';

export const useNotesViewMode = (): UseNotesViewModeResult => {
  const [view, setView] = useStoredState(
    VIEW_MODE_STORAGE_KEY,
    VIEW_MODE_CODEC,
  );
  /**
   * 已经挂载过的展示形式：第一次切换过去时才挂载一份，之后两边都留着，
   * 来回切只切显隐，不再把几百个条目整棵拆掉重建。
   */
  const [mounted, setMounted] = useState<Record<NotesViewMode, boolean>>(() => ({
    board: view === 'board',
    table: view === 'table',
  }));

  const toggle = () => {
    const next: NotesViewMode = view === 'board' ? 'table' : 'board';

    setView(next);
    setMounted((current) =>
      current[next] ? current : { ...current, [next]: true },
    );
  };

  return { isBoardView: view === 'board', mounted, toggle, view };
};
