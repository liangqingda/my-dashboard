/**
 * 英语笔记模块的纯工具函数。
 */

import { NOTE_CATEGORIES } from '@/features/english-notes/constants';

/** 从文件名取分类前缀：`errors-back-west-spacing.md` → `errors`。 */
export const getNoteCategory = (name: string): string => {
  const separator = name.indexOf('-');

  return separator > 0 ? name.slice(0, separator) : '';
};

/** 看板展示这六类前缀；`paper`（套题）等未开列的前缀不展示，也不参与翻页计数。 */
const BOARD_CATEGORIES: ReadonlySet<string> = new Set(
  NOTE_CATEGORIES.map((category) => category.key),
);

/** 这篇笔记是否属于看板展示的某一列。 */
export const isBoardNote = (name: string): boolean =>
  BOARD_CATEGORIES.has(getNoteCategory(name));
