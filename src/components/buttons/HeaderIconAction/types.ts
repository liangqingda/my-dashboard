/**
 * 标题栏图标操作的契约：图标 + 一句人话，颜色分档不改形状。
 */

import type { ReactNode } from 'react';

/** 标题栏图标操作按钮的语气：决定颜色，不改形状 */
export type HeaderIconActionTone = 'normal' | 'accent' | 'danger';

/** 图标操作的入参 */
export type HeaderIconActionProps = {
  /** 按钮含义：同时用于 tooltip 与 aria-label，图标本身不自解释 */
  label: string;
  /** 图标元素 */
  children: ReactNode;
  /** 语气：常规 / 主操作 / 危险 */
  tone?: HeaderIconActionTone;
  /** 禁用（如保存中不接受其它操作） */
  disabled?: boolean;
  /** 显示 loading（保存按钮用） */
  loading?: boolean;
  /** 点击 */
  onClick?: () => void;
  /** 按钮档位：`lg` 用于编辑态那排承担全部操作的按钮，`md` 与标题栏其它图标同档 */
  size?: 'md' | 'lg';
};
