/**
 * 英语笔记模块的常量。
 */

import { createChoiceCodec } from '@/utils/local-storage';

import type { NoteCategory, NotesSort, NotesViewMode } from './types';

/** 错题、短语、用法、语法、词汇、混合六类，顺序即页面列顺序与表格的分类排序顺序 */
export const NOTE_CATEGORIES: NoteCategory[] = [
  { key: 'errors', label: '错题' },
  { key: 'phrases', label: '短语' },
  { key: 'usage', label: '用法' },
  { key: 'grammar', label: '语法' },
  { key: 'vocabulary', label: '词汇' },
  { key: 'mixed', label: '混合' },
];

/** 表格视图的默认排序：按「笔记更新时间」倒序，新的在最上面 */
export const DEFAULT_NOTE_SORT: NotesSort = {
  key: 'updated',
  direction: 'desc',
};

/** 表格里字段缺失时的占位，避免出现空单元格 */
export const EMPTY_CELL = '—';

/** 展示形式（分列看板 / 表格）的存储键：刷新页面后保持上次切换到的形态 */
export const VIEW_MODE_STORAGE_KEY = 'my-dashboard:english:view-mode';

/** 展示形式的编解码：只认 board / table，写坏的存储值回落分列看板 */
export const VIEW_MODE_CODEC = createChoiceCodec<NotesViewMode>(
  ['board', 'table'],
  'board',
);

/** 笔记编辑器的撤销栈保留步数 */
export const UNDO_DEPTH = 50;
