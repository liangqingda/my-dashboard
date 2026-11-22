/**
 * 图标按钮的契约：图标 + 一句人话，语气只改颜色、尺寸按档、tooltip 在指到时才挂。
 */

import type { MouseEvent, ReactNode, Ref } from 'react';

/** 语气：决定颜色，不改形状 */
export type FreeIconActionTone = 'normal' | 'accent' | 'danger';

/**
 * tip 归谁挂：`hover` 本组件自己挂（被指到时才创建）；
 * `none` 只给按钮本体——由外壳自己管提示（如 `IconPopoverButton` 那种要拼状态与键位的弹层壳）。
 */
export type FreeIconActionTooltip = 'hover' | 'none';

/** 尺寸档：字段旁 / 标题栏与表格操作列 / 编辑态那排主操作 */
export type FreeIconActionSize = 'xs' | 'sm' | 'lg';

/** 图标按钮的入参 */
export type FreeIconActionProps = {
  /** 图标元素 */
  children: ReactNode;
  /** 按钮含义：aria-label 与默认 tooltip 用同一句人话 */
  label: string;
  /** 状态会变时的 tooltip 文案（如复制成功后的「已复制」）；aria-label 仍用 label */
  tooltipLabel?: string;
  /** tip 由谁挂，默认 `hover`（本组件挂）；`none` 只渲染按钮，提示交给外层 */
  tooltip?: FreeIconActionTooltip;
  /** 语气：常规 / 主操作 / 危险 */
  tone?: FreeIconActionTone;
  /** 尺寸档，默认 `sm` */
  size?: FreeIconActionSize;
  /** 禁用 */
  disabled?: boolean;
  /** 显示 loading */
  loading?: boolean;
  /** 进行中状态标给读屏（如刷新按钮正在转圈），`aria-busy` */
  ariaBusy?: boolean;
  /** 附加 class，只补布局（如表格单元格里居中），不改颜色与形状 */
  className?: string;
  /** 点击；需要吞掉冒泡时在调用方 `event.stopPropagation()` */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /**
   * 透传到底下的 `ActionIcon`：外层要把这颗按钮当锚点（`Popover.Target` 之类会 cloneElement
   * 注入 ref 的位置）时才用得上，业务侧不需要自己传。
   */
  ref?: Ref<HTMLButtonElement>;
};
