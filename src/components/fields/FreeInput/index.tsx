/**
 * 全站普通单行输入框：没有搜索 / 清空语义的表单输入统一走这里，`size="xs"` 只定一次。
 * 带搜索图标与一键清空的入口是 `FreeSearchInput`，别在这个组件里加搜索语义。
 * 密码框也走这里（`type="password"`），遮起来交给浏览器，不另做「眼睛」按钮。
 */

import { TextInput } from '@mantine/core';

import type { FreeInputProps } from './types';

const FreeInput = ({
  ariaLabel,
  autoFocus = false,
  description,
  inputRef,
  label,
  leftSection,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  styles,
  type = 'text',
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
    ref={inputRef}
    size="xs"
    styles={styles}
    type={type}
    value={value}
    w={width}
  />
);

export default FreeInput;
