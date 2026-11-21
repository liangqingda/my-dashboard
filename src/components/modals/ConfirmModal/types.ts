import type { ReactNode } from 'react';

/** 二次确认弹窗的入参：说清后果、可选的额外选择、两个出口 */
export type ConfirmModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 取消 / 关闭（Esc、遮罩、关闭按钮都走它；`loading` 时不会被调用） */
  onCancel: () => void;
  /** 标题：一句动作说明，如「删除这个文档？」 */
  title: ReactNode;
  /** 说明：删掉会发生什么 / 这一步的后果，软底块里显示 */
  description: ReactNode;
  /** 说明与按钮之间的额外内容（如「这次删什么」的勾选项）；不传就没有这一段 */
  children?: ReactNode;
  /** 确认按钮文案，默认「确定」 */
  confirmLabel?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelLabel?: string;
  /** 确认按钮走危险色（删除这类不可逆操作） */
  danger?: boolean;
  /** 请求进行中：确认按钮 loading，且整扇窗关不掉 */
  loading?: boolean;
  /** 确认按钮是否可点（如一项都没勾时不可点） */
  confirmDisabled?: boolean;
  /** 点确认 */
  onConfirm: () => void;
  /** 关闭按钮的 aria-label，默认「关闭确认」 */
  closeLabel?: string;
  /** 宽度档位，默认 420 */
  size?: number | string;
};
