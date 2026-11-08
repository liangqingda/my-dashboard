/**
 * 英语笔记模块的常量。
 */

import type { NoteCategory } from './types';

/** 错题、短语、用法、语法、词汇、混合六类，顺序即页面列顺序 */
export const NOTE_CATEGORIES: NoteCategory[] = [
  { key: 'errors', label: '错题' },
  { key: 'phrases', label: '短语' },
  { key: 'usage', label: '用法' },
  { key: 'grammar', label: '语法' },
  { key: 'vocabulary', label: '词汇' },
  { key: 'mixed', label: '混合' },
];

/** 笔记编辑器的撤销栈保留步数 */
export const UNDO_DEPTH = 50;
