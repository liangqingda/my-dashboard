/** 导出音频确认层的入参 */

/** 导出音频确认层的入参 */
export type AudioExportConfirmProps = {
  /** 当前视频名：说明块里点出「抽的是哪一条」 */
  itemName: string;
  /** 目标目录的展示文案（空设置时是「视频所在目录」） */
  targetLabel: string;
  /** 是否展开 */
  opened: boolean;
  /** 取消 */
  onCancel: () => void;
  /** 确认导出 */
  onConfirm: () => void;
};
