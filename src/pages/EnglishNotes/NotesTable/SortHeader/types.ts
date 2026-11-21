/**
 * 可排序列标题的 props。
 */

import type { NoteSortKey, NotesSort } from '../../types';

/** 可排序列标题的入参 */
export type SortHeaderProps = {
  /** 列标题文字，如「分类」 */
  label: string;
  /** 这一列对应的排序字段 */
  sortKey: NoteSortKey;
  /** 当前排序状态（哪一列、什么方向） */
  sort: NotesSort;
  /** 点击列标题：切到这一列，或同一列上反转方向 */
  onSort: (key: NoteSortKey) => void;
};
