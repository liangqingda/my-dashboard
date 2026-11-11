/**
 * 列表筛选的纯函数：按「笔记更新时间」与分类过滤摘要。
 *
 * 时间口径都用笔记更新时间（`NoteSummary.updatedAt`，由读盘侧解析好）：
 * 最近 N 小时 / 天 / 周 / 月按日历单位回退，指定日期按那一天 00:00–23:59 取整。
 * 时间未知（解析不出来）的笔记在时间档位下一律不出现——没法证明它在范围内，
 * 宁可少给也不要给错的；分类维度与时间维度是「与」的关系。
 */

import dayjs from 'dayjs';

import type {
  NoteSummary,
  NotesFilterCondition,
  NotesTimeRange,
} from '../types';
import { UNCATEGORIZED_CATEGORY } from '../constants';

import { toNoteTimestamp } from './notes';

/** 时间窗的起止毫秒 */
type TimeWindow = {
  /** 窗口起点（含） */
  start: number;
  /** 窗口终点（含） */
  end: number;
};

/**
 * 按范围算出时间窗；`null` 表示这一档不按时间筛
 * （全部时间，或「指定日期」还没选出一个能解析的日期）。
 */
const buildWindow = (
  range: NotesTimeRange,
  date: string,
): TimeWindow | null => {
  if (range === 'all') {
    return null;
  }

  if (range === 'date') {
    const day = dayjs(date);

    return day.isValid()
      ? { start: day.startOf('day').valueOf(), end: day.endOf('day').valueOf() }
      : null;
  }

  const now = Date.now();

  return { start: dayjs(now).subtract(1, range).valueOf(), end: now };
};

/** 有没有条件真的生效：决定 header 筛选图标高亮与「没筛到」的文案 */
export const isNotesFilterActive = (
  condition: NotesFilterCondition,
): boolean =>
  condition.categoryKey !== '' || buildWindow(condition.range, condition.date) !== null;

/** 按条件过滤笔记摘要：没条件生效时原样返回 */
export const filterNotes = (
  notes: NoteSummary[],
  condition: NotesFilterCondition,
): NoteSummary[] => {
  const window = buildWindow(condition.range, condition.date);
  const filteringByCategory = condition.categoryKey !== '';

  if (window === null && !filteringByCategory) {
    return notes;
  }

  /**
   * 真正要比的分类键：`UNCATEGORIZED_CATEGORY` 指向「未分类」，
   * 而那些笔记的分类键正是空串——空串在状态里表示「不按分类筛」，所以要先换回来。
   */
  const wantedCategory =
    condition.categoryKey === UNCATEGORIZED_CATEGORY
      ? ''
      : condition.categoryKey;

  return notes.filter((note) => {
    if (filteringByCategory && note.categoryKey !== wantedCategory) {
      return false;
    }

    if (window === null) {
      return true;
    }

    const updatedAt = toNoteTimestamp(note.updatedAt);

    return updatedAt > 0 && updatedAt >= window.start && updatedAt <= window.end;
  });
};
