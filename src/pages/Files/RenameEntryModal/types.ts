/**
 * 条目改名弹窗的 props。
 */

import type { RenamingEntry } from '../hooks/useEntryActions';

/** 弹窗的入参 */
export type RenameEntryModalProps = {
  /** 等待改名的条目；null 表示弹窗关闭 */
  entry: RenamingEntry | null;
  /** 改名请求进行中：按钮转圈并禁用 */
  loading: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 提交改名：给出新名字 */
  onCommit: (name: string) => void;
};
