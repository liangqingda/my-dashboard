/**
 * 表格平铺视图的 props。
 */

import type { NoteRow, NoteSortKey, NotesSort } from '../types';

/** 表格平铺视图的入参 */
export type NotesTableProps = {
  /** 摊平后的行，已按 `sort` 排好序 */
  rows: NoteRow[];
  /** 当前排序状态 */
  sort: NotesSort;
  /** 点击可排序的列标题 */
  onSort: (key: NoteSortKey) => void;
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因；有错误时不出「还没有笔记」的空态 */
  error: string | null;
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => Promise<void>;
};
