/**
 * 预览正文的筛选条件（范围 + 关键词）。
 *
 * 条件记在 localStorage 里：换一篇笔记、刷新页面都沿用上次的选择；
 * 筛选本身是纯函数（见 `utils/filter-markdown`），这里只管状态、持久化与「没条件就不筛」。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import type { NoteFilterScope, UseNoteFilterResult } from '../types';
import {
  FILTER_KEYWORD_CODEC,
  FILTER_KEYWORD_STORAGE_KEY,
  FILTER_SCOPE_CODEC,
  FILTER_SCOPE_STORAGE_KEY,
} from '../constants';
import { filterNoteMarkdown } from '../utils/filter-markdown';

export const useNoteFilter = (): UseNoteFilterResult => {
  const [scope, setScope] = useStoredState<NoteFilterScope>(
    FILTER_SCOPE_STORAGE_KEY,
    FILTER_SCOPE_CODEC,
  );
  const [keyword, setKeyword] = useStoredState<string>(
    FILTER_KEYWORD_STORAGE_KEY,
    FILTER_KEYWORD_CODEC,
  );

  /** 有条件生效：决定弹窗图标高亮，以及筛空后显示提示而不是一片空白 */
  const active = scope !== 'all' || keyword.trim() !== '';

  /** 预览态取正文：没条件时原样返回，省掉一次整篇切块 */
  const apply = useCallback(
    (markdown: string) =>
      active ? filterNoteMarkdown(markdown, { keyword, scope }) : markdown,
    [active, keyword, scope],
  );

  const reset = useCallback(() => {
    setScope('all');
    setKeyword('');
  }, [setKeyword, setScope]);

  return { active, apply, keyword, reset, scope, setKeyword, setScope };
};
