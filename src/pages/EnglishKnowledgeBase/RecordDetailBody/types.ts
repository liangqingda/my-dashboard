import type { RecordDetail } from '../types';

/** 详情主体：按 ID 自己取数，挂载即开始（父级用 key=recordId 保证换一条就重新挂载） */
export type RecordDetailBodyProps = {
  /** 要查看的记录 ID（不会为 null） */
  recordId: string;
  /** 取数完成 / 出错 / 正文就位后上报；父级据此安排开窗动画 */
  onReady?: () => void;
};

/** 详情主体的加载结果 */
export type DetailState = {
  detail: RecordDetail | null;
  error: string | null;
  loading: boolean;
};
