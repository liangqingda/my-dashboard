/**
 * 全站普通单行输入框：没有搜索 / 清空语义的表单输入统一走这里，`size="xs"` 只定一次。
 * 带搜索图标与一键清空的入口是 `FreeSearchInput`，别在这个组件里加搜索语义。
 */

import { TextInput } from '@mantine/core';

import type { FreeInputProps } from './types';

const FreeInput = ({
  ariaLabel,
  autoFocus = false,
  description,
  label,
  leftSection,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  styles,
  value,
  width,
}: FreeInputProps) => (
  <TextInput
    aria-label={ariaLabel}
    autoFocus={autoFocus}
    description={description}
    label={label}
    leftSection={leftSection}
    onBlur={onBlur}
    onChange={(event) => onChange(event.currentTarget.value)}
    onFocus={onFocus}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    size="xs"
    styles={styles}
    value={value}
    w={width}
  />
);

export default FreeInput;
