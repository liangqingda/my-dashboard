/**
 * 笔记单行（分列看板与表格平铺共用）的 props。
 */

import type { EnglishNote } from '../types';

/** 单行的入参 */
export type NoteItemProps = {
  /** 这一篇笔记 */
  note: EnglishNote;
  /** 所属列的分类前缀，用来去掉重复前缀 */
  category: string;
  /** 打开预览 */
  onOpen: (name: string) => Promise<void>;
  /** 是否在文件名下方显示「笔记更新时间」；看板不显示，表格平铺显示 */
  showUpdated?: boolean;
};
