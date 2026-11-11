import type { ReactNode } from 'react';

/** 标题栏筛选按钮的入参：开合由弹窗控制，弹层内容由调用方给 */
export type FilterButtonProps = {
  /** 是否有筛选条件生效；生效时图标用主色，提示也跟着变 */
  active: boolean;
  /** 弹层内容：筛什么、怎么筛都在文档类别那边 */
  children: ReactNode;
  /** 开合变化 */
  onChange: (opened: boolean) => void;
  /** 弹层是否打开 */
  opened: boolean;
};
