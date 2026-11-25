/**
 * 普通单行输入框的契约：值 + 改动回调，尺寸档与外观由组件自己定。
 */

import type {
  FocusEventHandler,
  KeyboardEventHandler,
  ReactNode,
  Ref,
} from 'react';
import type { TextInputProps } from '@mantine/core';

/** 普通单行输入框的入参 */
export type FreeInputProps = {
  /** 读屏名（输入框本身没有可见标签时也要有） */
  ariaLabel: string;
  /** 值 */
  value: string;
  /** 值变化 */
  onChange: (value: string) => void;
  /** 占位文案 */
  placeholder?: string;
  /** 可见标签（表单口径） */
  label?: string;
  /** 标签下方单行说明 */
  description?: string;
  /** 回车等按键行为由调用方给（输入框自己不抢键） */
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  /** 聚焦行为（如聚焦时全选文本）由调用方给 */
  onFocus?: FocusEventHandler<HTMLInputElement>;
  /** 失焦行为（如失焦提交）由调用方给 */
  onBlur?: FocusEventHandler<HTMLInputElement>;
  /** 挂载即聚焦（就地改名这类场景） */
  autoFocus?: boolean;
  /** 左侧附加内容（如图标）；没有搜索语义时不要硬塞搜索图标 */
  leftSection?: ReactNode;
  /** 面板内字段间距这类既有口径，不在这里写新样式 */
  styles?: TextInputProps['styles'];
  /**
   * 输入类型：默认明文；密码这类要遮起来时传 `'password'`（遮起来由浏览器画，不另做眼睛按钮）
   */
  type?: 'text' | 'password';
  /** 外部拿输入框本体：弹窗这类「挂载后下一拍才在 DOM 里」的场景要自己聚焦 / 全选 */
  inputRef?: Ref<HTMLInputElement>;
  /** 固定宽度（工具栏里按内容定宽时用） */
  width?: number | string;
};
