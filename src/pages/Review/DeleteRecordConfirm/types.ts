import type { RecordSummary } from '../types';

/** 删除确认弹窗的入参：要删哪一条、是否正在删、取消与确认 */
export type DeleteRecordConfirmProps = {
  /** 等待确认删除的记录；null 表示弹窗关闭 */
  record: RecordSummary | null;
  /** 删除请求进行中：按钮转圈并禁用 */
  loading: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 确认删除 */
  onConfirm: () => void;
};
