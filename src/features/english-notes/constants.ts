/**
 * 英语笔记模块的常量。
 */

/** 笔记文件名里的分类前缀与中文标题 */
export type NoteCategory = {
  /** 文件名前缀，如 errors */
  key: string;
  /** 列标题 */
  label: string;
};

/** 错题、短语、用法、语法、词汇五类，顺序即页面列顺序 */
export const NOTE_CATEGORIES: NoteCategory[] = [
  { key: 'errors', label: '错题' },
  { key: 'phrases', label: '短语' },
  { key: 'usage', label: '用法' },
  { key: 'grammar', label: '语法' },
  { key: 'vocabulary', label: '词汇' },
];
