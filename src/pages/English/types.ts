/**
 * 英语笔记模块的类型定义。
 * 笔记来源为 learn-english 仓库的 learning-record-notes/*.md。
 */

/** 一篇学习笔记 */
export type EnglishNote = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 一次读取得到的笔记集合 */
export type EnglishNotesSnapshot = {
  /** 全部笔记，按最后修改时间倒序 */
  notes: EnglishNote[];
};
