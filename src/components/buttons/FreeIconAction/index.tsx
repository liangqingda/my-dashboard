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
 */

import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';

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
  size = 'sm',
  tone = 'normal',
  tooltipLabel,
}: FreeIconActionProps) => {
  const [active, hoverHandlers] = useHoverIntent();
  /** tip 的定位目标：就是下面这个按钮自己 */
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
  };

  return (
    <>
      <ActionIcon
        aria-busy={ariaBusy || undefined}
        aria-label={label}
        className={cx(styles.button, TONE_CLASS[tone], className)}
        disabled={disabled}
        loading={loading}
        onClick={handleClick}
        ref={buttonRef}
        size={size}
        variant="subtle"
        {...hoverHandlers}
      >
        {children}
      </ActionIcon>
      {active ? (
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
