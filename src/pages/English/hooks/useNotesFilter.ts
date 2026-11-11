/**
 * 英语列表的筛选条件（时间范围 + 指定日期 + 分类）。
 *
 * 条件记在 localStorage 里：刷新页面重新进入仍沿用上次的选择；
 * 筛选本身是纯函数（见 `utils/filter-notes`），这里只管状态、持久化与「没条件就不筛」。
 * 与预览弹窗里的正文筛选（`hooks/useNoteFilter`）互不相干：一个筛列表，一个筛正文。
 */

import { useCallback } from 'react';
import dayjs from 'dayjs';

import { useStoredState } from '@/hooks/useStoredState';

import type { NoteSummary, NotesTimeRange, UseNotesFilterResult } from '../types';
import {
  NOTES_FILTER_CATEGORY_STORAGE_KEY,
  NOTES_FILTER_DATE_STORAGE_KEY,
  NOTES_FILTER_RANGE_CODEC,
  NOTES_FILTER_RANGE_STORAGE_KEY,
  TEXT_CODEC,
} from '../constants';
import { filterNotes, isNotesFilterActive } from '../utils/filter-notes';

export const useNotesFilter = (): UseNotesFilterResult => {
  const [range, setRangeState] = useStoredState<NotesTimeRange>(
    NOTES_FILTER_RANGE_STORAGE_KEY,
    NOTES_FILTER_RANGE_CODEC,
  );
  const [date, setDate] = useStoredState<string>(
    NOTES_FILTER_DATE_STORAGE_KEY,
    TEXT_CODEC,
  );
  const [categoryKey, setCategoryKey] = useStoredState<string>(
    NOTES_FILTER_CATEGORY_STORAGE_KEY,
    TEXT_CODEC,
  );

  const setRange = useCallback(
    (next: NotesTimeRange) => {
      setRangeState(next);

      // 切到「指定日期」时先落到今天：日历一出现就有选中值，不会停在一个空输入上
      if (next === 'date' && date === '') {
        setDate(dayjs().format('YYYY-MM-DD'));
      }
    },
    [date, setDate, setRangeState],
  );

  const active = isNotesFilterActive({ categoryKey, date, range });

  const apply = useCallback(
    (notes: NoteSummary[]) => filterNotes(notes, { categoryKey, date, range }),
    [categoryKey, date, range],
  );

  const reset = useCallback(() => {
    setRangeState('all');
    setDate('');
    setCategoryKey('');
  }, [setCategoryKey, setDate, setRangeState]);

  return {
    active,
    apply,
    categoryKey,
    date,
    range,
    reset,
    setCategoryKey,
    setDate,
    setRange,
  };
};
