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
 * `tipDuration`：tip 只亮一小会儿（悬停 1.5s 后自己收掉，指针不动也不再挂着）——
 * 给视频控制栏那两颗箭头用，它们一直在画面下方，常挂提示会挡住进度条。
 *
 * `tooltip="none"` 时只渲染按钮本体（单节点 + ref 透传），留给外壳自己把提示拼上：
 * `Popover.Target` 这类位置要的是「一个能接 ref 的元素」，两个节点塞不进去。
 * 此时按钮外观仍由这里出，外壳不许再抄一份颜色规则。
 */

import { useEffect, useRef, useState } from 'react';
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
  tipDark = false,
  tipDuration,
  tone = 'normal',
  tooltip,
  tooltipLabel,
}: FreeIconActionProps) => {
  const [hovered, hoverHandlers] = useHoverIntent();
  /** tip 到时收起：指针还停着也不挂，下次再进来重新亮 */
  const [tipExpired, setTipExpired] = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTipTimer = () => {
    if (tipTimer.current !== undefined) {
      clearTimeout(tipTimer.current);
      tipTimer.current = undefined;
    }
  };

  useEffect(() => clearTipTimer, []);

  /** 定时收起的 tip：进入时先亮，`tipDuration` 之后自己收掉 */
  const timedHandlers = {
    onBlur: () => {
      clearTipTimer();
      hoverHandlers.onBlur();
    },
    onFocus: () => {
      clearTipTimer();
      setTipExpired(false);
      hoverHandlers.onFocus();
      tipTimer.current = setTimeout(() => setTipExpired(true), tipDuration);
    },
    onMouseEnter: () => {
      clearTipTimer();
      setTipExpired(false);
      hoverHandlers.onMouseEnter();
      tipTimer.current = setTimeout(() => setTipExpired(true), tipDuration);
    },
    onMouseLeave: () => {
      clearTipTimer();
      hoverHandlers.onMouseLeave();
    },
  };
  /** 没设时长就沿用原来的「指着就一直挂」 */
  const activeHandlers = tipDuration === undefined ? hoverHandlers : timedHandlers;
  /** tip 的定位目标：就是下面这个按钮自己；禁用时换成包在外面的壳（禁用按钮不一定收得到指针事件） */
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const disabledWrapRef = useRef<HTMLSpanElement | null>(null);
  const mergedRef = useMergedRef(buttonRef, ref);
  /** 禁用且要出提示：事件铺在外层 span 上，按钮本体不接 hover */
  const disabledTip = disabled && tooltip !== 'none';

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
      {...(tooltip === 'none' || disabledTip ? {} : activeHandlers)}
    >
      {children}
    </ActionIcon>
  );

  if (tooltip === 'none') {
    return button;
  }

  const tip =
    hovered && !tipExpired ? (
      <Tooltip
        classNames={{ tooltip: cx(tipDark && styles.tipDark) }}
        label={tooltipLabel ?? label}
        opened
        target={disabledTip ? disabledWrapRef : buttonRef}
        withArrow
      />
    ) : null;

  if (disabledTip) {
    return (
      <>
        <span className={styles.disabled} ref={disabledWrapRef} {...activeHandlers}>
          {button}
        </span>
        {tip}
      </>
    );
  }

  return (
    <>
      {button}
      {tip}
    </>
  );
};

export default FreeIconAction;
