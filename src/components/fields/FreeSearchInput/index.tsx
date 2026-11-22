/**
 * 全站搜索框：`TextInput` + 左侧搜索图标 + 右侧一键清空，`size="xs"` 只在这里定一次。
 *
 * 两处工具栏（知识库记录、笔记筛选面包）原本各拼一遍，清空按钮一个用 `CloseButton`、
 * 一个手写 `ActionIcon`，尺寸还不一样；现在清空行为也统一：值非空才出现，点了清空并**把焦点留在输入框**，
 * 继续打字不用再点一次。
 *
 * 只管输入框这一块：值、占位文案、回车行为、要不要带标题 / 说明、面板里的字段间距都由调用方给。
 */

import { useEffect, useRef } from 'react';
import { CloseButton, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

import type { FreeSearchInputProps } from './types';

/** 搜索图标与标题栏其它图标同档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

const FreeSearchInput = ({
  ariaLabel,
  autoFocus = false,
  clearLabel = '清空搜索',
  description,
  label,
  onChange,
  onKeyDown,
  placeholder,
  styles,
  value,
  width,
}: FreeSearchInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  /** 面板一打开就能直接打字（如筛选面板）；普通工具栏不传 */
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange('');
    // 清空后焦点留在输入框：接着搜下一个不用再点一次
    inputRef.current?.focus();
  };

  return (
    <TextInput
      aria-label={ariaLabel}
      description={description}
      label={label}
      leftSection={<IconSearch size={ICON_SIZE} stroke={ICON_STROKE} />}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      ref={inputRef}
      rightSection={
        value === '' ? null : (
          <CloseButton
            aria-label={clearLabel}
            onClick={handleClear}
            size="xs"
          />
        )
      }
      size="xs"
      styles={styles}
      value={value}
      w={width}
    />
  );
};

export default FreeSearchInput;
