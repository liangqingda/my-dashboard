/**
 * 英语笔记模块的纯工具函数：分类归属、看板分列、文件名展示与编辑态序列化。
 */

import type { EnglishNote, NoteColumn } from '../types';
import { NOTE_CATEGORIES } from '../constants';

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

/** 把文件名拆成主名与扩展名，扩展名弱化展示。 */
export const splitNoteName = (
  name: string,
): {
  /** 主名，不含扩展名 */
  base: string;
  /** 扩展名，含点号；没有扩展名时为空串 */
  extension: string;
} => {
  const index = name.lastIndexOf('.');

  if (index <= 0) {
    return { base: name, extension: '' };
  }

  return { base: name.slice(0, index), extension: name.slice(index) };
};

/** 列标题已经写明分类，列表里去掉重复的分类前缀。 */
export const stripCategoryPrefix = (base: string, category: string): string =>
  base.startsWith(`${category}-`) ? base.slice(category.length + 1) : base;

/**
 * 把笔记按类分列：一次遍历建 Map，每列只排一次序（按文件名）。
 *
 * 保存会刷新修改时间，按时间排会让笔记在列里乱跳，所以固定按文件名排。
 * 空列也返回（笔记为空），由看板自己决定「这一列为空」还是「整目录为空」。
 */
export const groupNotesByCategory = (notes: EnglishNote[]): NoteColumn[] => {
  const byCategory = new Map<string, EnglishNote[]>();

  for (const note of notes) {
    const category = getNoteCategory(note.name);

    if (!BOARD_CATEGORIES.has(category)) {
      continue;
    }

    const bucket = byCategory.get(category) ?? [];

    bucket[bucket.length] = note;
    byCategory.set(category, bucket);
  }

  return NOTE_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    notes: (byCategory.get(key) ?? []).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }));
};

/** 判断事件目标是不是正在输入的控件（那里交给浏览器自己的撤销） */
export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
