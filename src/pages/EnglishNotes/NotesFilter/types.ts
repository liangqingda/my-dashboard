import type { NoteCategory, NotesTimeRange } from '../types';

/** 一个时间范围选项：下拉里的一档 + 收起后补的一行说明 */
export type NotesRangeOption = {
  /** 存进 localStorage 的值 */
  value: NotesTimeRange;
  /** 下拉里的档名 */
  label: string;
  /** 收起后的一行口径说明；「指定日期」这档的文案随选中的日期变，不用这份 */
  description: string;
};

/** 列表筛选面板的入参：条件由页面持有（要持久化），面板只负责展示与回传 */
export type NotesFilterProps = {
  /** 当前时间范围 */
  range: NotesTimeRange;
  /** 当前指定日期，`YYYY-MM-DD` */
  date: string;
  /** 当前分类键，空串表示全部分类 */
  categoryKey: string;
  /** 可选分类：来自记录仓库的分类清单（页面算好的看板列） */
  categories: NoteCategory[];
  /** 换时间范围 */
  onRangeChange: (range: NotesTimeRange) => void;
  /** 改指定日期 */
  onDateChange: (date: string) => void;
  /** 换分类 */
  onCategoryChange: (key: string) => void;
  /** 清空条件 */
  onReset: () => void;
};
