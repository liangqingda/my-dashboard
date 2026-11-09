/**
 * 复制图标按钮：点一下把文本写进剪贴板，成功后图标换成对勾并在 1.5 秒内复原。
 *
 * 供表格操作列与 Markdown 预览弹窗 header 共用。点击事件不向父级冒泡：
 * 嵌在「整行可点击」的表格里时，复制不会顺带打开那一行。
 * 复制失败（权限被拒且兜底也失败）只弹一条提示，不静默失败。
 */

import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy } from '@tabler/icons-react';

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
    <Tooltip label={copied ? copiedLabel : label} withArrow>
      <ActionIcon
        aria-label={label}
        className={cx(styles.button, className)}
        onClick={(event) => void handleCopy(event)}
        size={size}
        variant="subtle"
      >
        {copied ? (
          <IconCheck size={iconSize} stroke={1.9} />
        ) : (
          <IconCopy size={iconSize} stroke={1.9} />
        )}
      </ActionIcon>
    </Tooltip>
  );
};

export default CopyIconButton;
