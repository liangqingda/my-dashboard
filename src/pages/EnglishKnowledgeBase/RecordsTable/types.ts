import type { RecordSummary } from '../types';

/** 记录列表表格的入参：只负责展示与转发点击，过滤与取数在页面 / hook */
export type RecordsTableProps = {
  /** 当前要展示的记录，已按更新时间倒序 */
  records: RecordSummary[];
  /** 分类键 → 中文标题 */
  categoryLabels: Map<string, string>;
  /** 点整行 / 标题：打开详情 */
  onOpen: (record: RecordSummary) => void;
  /** 点删除图标：交给页面弹确认框 */
  onDelete: (record: RecordSummary) => void;
};
