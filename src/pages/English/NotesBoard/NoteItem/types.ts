/**
 * 看板单行的 props。
 */

import type { EnglishNote } from '../../types';

/** 列表单行的入参 */
export type NoteItemProps = {
  /** 这一篇笔记 */
  note: EnglishNote;
  /** 所属列的分类键，用来去掉文件名里重复的分类前缀 */
  category: string;
  /** 打开预览 */
  onOpen: (name: string) => Promise<void>;
};
