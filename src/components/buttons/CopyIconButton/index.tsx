/**
 * 复制图标按钮：点一下把文本写进剪贴板，成功后图标换成对勾并在 1.5 秒内复原。
 *
 * 供表格操作列与 Markdown 预览弹窗 header 共用。点击事件不向父级冒泡：
 * 嵌在「整行可点击」的表格里时，复制不会顺带打开那一行。
 * 复制失败（权限被拒且兜底也失败）只弹一条提示，不静默失败。
 *
 * tip 只在指针停在这个图标上时创建（见 `useHoverIntent`）：表格里几百行的复制按钮如果
 * 各自常驻一个 Tooltip，光挂载就要建几百套浮动定位实例，而这些提示平时根本看不见。
 * tip 挂在按钮旁边、由 `target` 指回去，出现与消失不会替换按钮元素。
 */

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy } from '@tabler/icons-react';

import { useHoverIntent } from '@/hooks/useHoverIntent';
import { COPY_FEEDBACK_DURATION, copyText } from '@/utils/clipboard';
import { cx } from '@/utils/cx';

import type { CopyIconButtonProps } from './types';
import { COPY_FAILED_NOTICE_ID } from './constants';

import styles from './index.scss';

const CopyIconButton = ({
  className,
  copiedLabel = '已复制',
  iconSize = 15,
  label,
  size = 'sm',
  text,
}: CopyIconButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [active, hoverHandlers] = useHoverIntent();
  /** tip 的定位目标：就是下面这个按钮自己 */
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 卸载时清掉复原定时器，避免对已卸载组件 setState
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    // 先把点击吞掉：嵌在整行可点击的表格里时，复制不该顺带打开那一行
    event.stopPropagation();

    const ok = await copyText(text);

    window.clearTimeout(timer.current);

    if (!ok) {
      notifications.show({
        color: 'red',
        id: COPY_FAILED_NOTICE_ID,
        message: '复制失败，请手动复制',
      });

      return;
    }

    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  };

  return (
    <>
      <ActionIcon
        aria-label={label}
        className={cx(styles.button, className)}
        onClick={(event) => void handleCopy(event)}
        ref={buttonRef}
        size={size}
        variant="subtle"
        {...hoverHandlers}
      >
        {copied ? (
          <IconCheck size={iconSize} stroke={1.9} />
        ) : (
          <IconCopy size={iconSize} stroke={1.9} />
        )}
      </ActionIcon>
      {active ? (
        <Tooltip
          label={copied ? copiedLabel : label}
          opened
          target={buttonRef}
          withArrow
        />
      ) : null}
    </>
  );
};

export default CopyIconButton;
