/**
 * 单行文本：容器放不下才省略，且**只有被省略时**才在 hover / 键盘聚焦时用 tip 展示完整内容。
 * 文本本来就放得下时不弹任何提示，不给读者加噪音。
 *
 * tip 与量宽都推迟到「被指到的那一刻」才发生（见 `useHoverIntent`）：列表里几百个条目
 * 各自常驻一个 Tooltip 会白付几百套浮动定位实例的挂载成本，各自挂一个 ResizeObserver
 * 量宽则会拆成几百次强制重排。tip 挂在目标元素旁边、由 `target` 指回去，因此它的
 * 出现与消失不会替换文本元素本身（焦点与鼠标状态都留在原地）。
 */

import { useCallback, useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import { useHoverIntent } from '@/hooks/useHoverIntent';
import { cx } from '@/utils/cx';

import useIsTruncated from './hooks/useIsTruncated';
import type { TruncatedTextProps } from './types';

import styles from './index.scss';

const TruncatedText = ({
  className,
  disabled = false,
  inline = false,
  onClick,
  position = 'right',
  text,
}: TruncatedTextProps) => {
  const { measure, ref, targetRef } = useIsTruncated();
  /** 被指到的那一刻量出来的结果；没量过就是「放得下」，不弹 tip */
  const [truncated, setTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    setTruncated(measure());
  }, [measure]);

  const [active, hoverHandlers] = useHoverIntent(checkTruncation);

  const classes = cx(styles.text, inline && styles.inline, className);

  const content = onClick ? (
    <UnstyledButton
      className={classes}
      disabled={disabled}
      onClick={onClick}
      ref={ref}
      type="button"
      {...hoverHandlers}
    >
      {text}
    </UnstyledButton>
  ) : (
    <span className={classes} ref={ref} {...hoverHandlers}>
      {text}
    </span>
  );

  /** 三者缺一就不挂 tip：没被指到、文本放得下、或当前禁用 */
  const showTip = active && truncated && !disabled;

  return (
    <>
      {content}
      {showTip ? (
        <Tooltip
          arrowSize={5}
          classNames={{ tooltip: styles.tooltip }}
          label={text}
          multiline
          offset={10}
          opened
          position={position}
          radius={4}
          target={targetRef}
          withArrow
        />
      ) : null}
    </>
  );
};

export default TruncatedText;
