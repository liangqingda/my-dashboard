/**
 * 单行文本：容器放不下才省略，且**只有被省略时**才在 hover / 键盘聚焦时用 tip 展示完整内容。
 * 文本本来就放得下时不弹任何提示，不给读者加噪音。
 */

import { Tooltip, UnstyledButton } from '@mantine/core';

import { cx } from '@/utils/cx';

import useIsTruncated from './hooks/useIsTruncated';
import type { TruncatedTextProps } from './types';

import styles from './index.scss';

const TruncatedText = ({
  className,
  disabled = false,
  inline = false,
  onClick,
  openDelay = 0,
  position = 'left-start',
  text,
}: TruncatedTextProps) => {
  const { ref, truncated } = useIsTruncated(text);

  const classes = cx(styles.text, inline && styles.inline, className);

  return (
    <Tooltip
      arrowSize={5}
      classNames={{ tooltip: styles.tooltip }}
      disabled={disabled || !truncated}
      events={{ focus: true, hover: true, touch: false }}
      label={text}
      multiline
      offset={10}
      openDelay={openDelay}
      position={position}
      radius={4}
      withArrow
    >
      {onClick ? (
        <UnstyledButton
          className={classes}
          disabled={disabled}
          onClick={onClick}
          ref={ref}
          type="button"
        >
          {text}
        </UnstyledButton>
      ) : (
        <span className={classes} ref={ref}>
          {text}
        </span>
      )}
    </Tooltip>
  );
};

export default TruncatedText;
