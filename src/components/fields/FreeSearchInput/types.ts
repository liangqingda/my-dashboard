/**
 * 搜索框的契约：值 + 改动回调，外观（图标 / 清空 / 尺寸档）由组件自己定。
 */

import type { KeyboardEventHandler } from 'react';
import type { TextInputProps } from '@mantine/core';

/** 搜索框的入参 */
export type FreeSearchInputProps = {
  /** 读屏名（输入框本身没有可见标签时也要有） */
  ariaLabel: string;
  /** 值 */
  value: string;
  /** 值变化：输入与清空都走它（清空等价于传空串） */
  onChange: (value: string) => void;
  /** 占位文案 */
  placeholder?: string;
  /** 挂载即聚焦（筛选面板这类「打开就能打字」的场景） */
  autoFocus?: boolean;
  /** 清空按钮的读屏名，默认「清空搜索」 */
  clearLabel?: string;
  /** 可见标签（表单口径） */
  label?: string;
  /** 标签下方单行说明（如命中计数） */
  description?: string;
  /** 回车 / 方向键等按键行为由调用方给（搜索框自己不抢键） */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  /** 面板内字段间距这类既有口径（如 `PANEL_FIELD_STYLES`），不在这里写新样式 */
  styles?: TextInputProps['styles'];
  /** 固定宽度（工具栏里按内容定宽时用） */
  width?: number | string;
};
