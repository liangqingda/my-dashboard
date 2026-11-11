import type { ReactNode } from 'react';

/** 筛选图标按钮的入参：开合由调用方控制，弹层内容由调用方给 */
export type FilterButtonProps = {
  /** 是否有筛选条件生效；生效时图标用主色，提示也跟着变 */
  active: boolean;
  /** 弹层内容：筛什么、怎么筛都归调用方 */
  children: ReactNode;
  /** 开合变化 */
  onChange: (opened: boolean) => void;
  /** 弹层是否打开 */
  opened: boolean;
  /** tooltip 与 aria-label 的文案（如「筛选正文」「筛选笔记」），生效时会追加「（已生效）」 */
  label: string;
  /** 弹层宽度；内容里放日历这类宽控件时由调用方放宽 */
  width?: number;
};
