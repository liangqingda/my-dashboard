import type { ReactNode } from 'react';

/**
 * 带弹层的图标按钮的入参：开合由调用方控制，弹层内容由调用方给，
 * 这里只负责按钮外观、就近弹层与「生效」高亮。
 */
export type IconPopoverButtonProps = {
  /** 按钮里的图标（尺寸按同排图标由调用方给） */
  icon: ReactNode;
  /** aria-label 与默认 tooltip 文案（如「筛选正文」「调节正文字号」） */
  label: string;
  /** 覆盖 tooltip 文案：需要把当前状态写进提示时传（如「正文字号（+2px）」） */
  hint?: string;
  /** 是否有条件生效：为真时图标常态用主色；没传 hint 时 tooltip 追加「（已生效）」 */
  active?: boolean;
  /** 弹层是否打开 */
  opened: boolean;
  /** 开合变化（点图标、点弹层外面、按 Esc 都会走到这里） */
  onChange: (opened: boolean) => void;
  /** 弹层宽度；内容里放日历这类宽控件时由调用方放宽 */
  width?: number;
  /** 弹层内容 */
  children: ReactNode;
};
