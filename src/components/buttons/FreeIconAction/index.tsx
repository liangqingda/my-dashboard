/**
 * 全站图标按钮：图标不自解释，所以 tooltip 与 aria-label 用同一句人话；
 * 形状（尺寸档 / `subtle` 变体）、颜色档与 tooltip 的挂载时机都只在这里定一次。
 *
 * 尺寸档：`xs` 贴着字段或文字用、`sm` 标题栏与表格操作列、`lg` 编辑态那排承担全部操作的按钮。
 * 语气（`tone`）只改颜色，不改形状——同一位置不会出现大小不一的按钮。
 *
 * tip 只在指针停上来时创建（见 `useHoverIntent`）：表格里几百行的图标按钮各自常驻一个
 * Tooltip，光挂载就要建几百套浮动定位实例，而这些提示平时根本看不见。
 * 状态会变的含义（如复制成功后的「已复制」）走 `tooltipLabel`，`aria-label` 仍保持稳定。
 *
 * `tooltip="none"` 时只渲染按钮本体（单节点 + ref 透传），留给外壳自己把提示拼上：
 * `Popover.Target` 这类位置要的是「一个能接 ref 的元素」，两个节点塞不进去。
 * 此时按钮外观仍由这里出，外壳不许再抄一份颜色规则。
 */

import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';

import { useHoverIntent } from '@/hooks/useHoverIntent';
import { cx } from '@/utils/cx';

import type { FreeIconActionProps } from './types';
import { TONE_CLASS } from './constants';

import styles from './index.scss';

const FreeIconAction = ({
  ariaBusy,
  children,
  className,
  disabled = false,
  label,
  loading = false,
  onClick,
  ref,
  size = 'sm',
  tone = 'normal',
  tooltip,
  tooltipLabel,
}: FreeIconActionProps) => {
  const [hovered, hoverHandlers] = useHoverIntent();
  /** tip 的定位目标：就是下面这个按钮自己 */
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useMergedRef(buttonRef, ref);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
  };

  const button = (
    <ActionIcon
      aria-busy={ariaBusy || undefined}
      aria-label={label}
      className={cx(styles.button, TONE_CLASS[tone], className)}
      disabled={disabled}
      loading={loading}
      onClick={handleClick}
      ref={mergedRef}
      size={size}
      variant="subtle"
      {...(tooltip === 'none' ? {} : hoverHandlers)}
    >
      {children}
    </ActionIcon>
  );

  if (tooltip === 'none') {
    return button;
  }

  return (
    <>
      {button}
      {hovered ? (
        <Tooltip
          label={tooltipLabel ?? label}
          opened
          target={buttonRef}
          withArrow
        />
      ) : null}
    </>
  );
};

export default FreeIconAction;
