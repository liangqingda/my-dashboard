/**
 * 文件改名弹窗的 props。
 */

import type { FileEntry } from '../types';

/** 弹窗的入参 */
export type RenameFileModalProps = {
  /** 等待改名的文件；null 表示弹窗关闭 */
  file: FileEntry | null;
  /** 改名请求进行中：按钮转圈并禁用 */
  loading: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 提交改名：给出新文件名 */
  onCommit: (name: string) => void;
};
