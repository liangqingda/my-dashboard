import type { ReactNode } from 'react';

/** 普通弹窗外壳的入参：标题、右上角操作与正文，取消 / 确认这类按钮放在正文末尾 */
export type FreeDialogProps = {
  /** 是否打开 */
  opened: boolean;
  /** 关闭（Esc、点遮罩、点关闭按钮都走它） */
  onClose: () => void;
  /** header 标题：一句动作说明或对象名 */
  title: ReactNode;
  /** 正文：说明文字、勾选项、操作按钮都由调用方排 */
  children: ReactNode;
  /** header 右侧、关闭按钮之前的操作（如刷新） */
  headerActions?: ReactNode;
  /** 是否显示关闭按钮，默认显示（提交中这类「先别关」的场景传 false） */
  closeButton?: boolean;
  /** Esc 是否关闭，默认是 */
  closeOnEscape?: boolean;
  /** 点遮罩是否关闭，默认是（请求进行中由调用方传 false） */
  closeOnClickOutside?: boolean;
  /** 是否把焦点锁在弹窗里，默认是 */
  trapFocus?: boolean;
  /** 是否垂直居中，默认是 */
  centered?: boolean;
  /** 宽度档位，默认 `min(520px, 92vw)` */
  size?: number | string;
  /** 关闭按钮的 aria-label，默认「关闭」 */
  closeLabel?: string;
  /** 追加到框体上的类名（只加增量，不复制框体样式） */
  contentClassName?: string;
  /** 追加到正文容器上的类名 */
  bodyClassName?: string;
};
