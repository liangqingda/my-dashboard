/** 记录详情弹窗的入参：只认记录 ID，详情由正文组件按 ID 取 */
export type RecordDetailModalProps = {
  /** 要查看的记录 ID；null 表示弹窗关闭 */
  recordId: string | null;
  /** 关闭弹窗 */
  onClose: () => void;
};
