/**
 * 全站普通单行输入框：没有搜索 / 清空语义的表单输入统一走这里，`size="xs"` 只定一次。
 * 带搜索图标与一键清空的入口是 `FreeSearchInput`，别在这个组件里加搜索语义。
 * 密码框也走这里（`type="password"`）：遮起来交给浏览器，右侧自带一颗「眼睛」按钮显示明文
 * （明文只当场切、不记忆；调用方不用自己接按钮）。
 */

import { useRef, useState } from 'react';
import { TextInput } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import type { FreeInputProps } from './types';

/** 眼睛图标：贴着字段用，比字段标题的图标小一号 */
const EYE_SIZE = 14;

/** 右侧那颗按钮的槽宽：`xs` 档的图标按钮放进 `rightSection` 正好不被裁 */
const EYE_SECTION_WIDTH = 30;

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
}: FreeInputProps) => {
  /** 密码框是否当场露出明文：只留在这一次输入里，关掉再开又回到遮起来 */
  const [revealed, setRevealed] = useState(false);
  /** 自己的 ref：点完眼睛把焦点还给输入框，免得之后敲的字落在按钮上 */
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(innerRef, inputRef);
  const masked = type === 'password';

  /** 点眼睛只切遮不遮，焦点留在输入框里，接着就能继续敲 */
  const toggleReveal = () => {
    setRevealed((prev) => !prev);
    innerRef.current?.focus();
  };

  /** 遮起来的那一档给一颗「眼睛」：独立按钮，不抢回车、不提交表单 */
  const rightSection = masked ? (
    <FreeIconAction
      label={revealed ? '隐藏密码' : '显示密码'}
      onClick={toggleReveal}
      size="xs"
      tone="normal"
    >
      {revealed ? (
        <IconEyeOff size={EYE_SIZE} stroke={1.6} />
      ) : (
        <IconEye size={EYE_SIZE} stroke={1.6} />
      )}
    </FreeIconAction>
  ) : undefined;

  return (
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
      ref={mergedRef}
      rightSection={rightSection}
      rightSectionPointerEvents={masked ? 'all' : undefined}
      rightSectionWidth={masked ? EYE_SECTION_WIDTH : undefined}
      size="xs"
      styles={styles}
      type={masked && !revealed ? 'password' : 'text'}
      value={value}
      w={width}
    />
  );
};

export default FreeInput;
