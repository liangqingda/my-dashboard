/**
 * 标题导航的单条：默认单行省略；只有被截断的那条，hover / 键盘聚焦时才用 tip 展示完整标题。
 */

import { Tooltip } from '@mantine/core';

import useIsTruncated from '../../hooks/useIsTruncated';
import type { OutlineNavItemProps } from '../../types';

import styles from './index.scss';

const OutlineNavItem = ({
  disabled,
  level,
  onSelect,
  text,
}: OutlineNavItemProps) => {
  const { ref, truncated } = useIsTruncated<HTMLButtonElement>(text);

  return (
    <Tooltip
      arrowSize={5}
      classNames={{ tooltip: styles.tooltip }}
      disabled={disabled || !truncated}
      events={{ focus: true, hover: true, touch: false }}
      label={text}
      multiline
      offset={10}
      openDelay={0}
      position="left-start"
      radius={4}
      withArrow
    >
      <button
        className={styles.item}
        data-level={level}
        disabled={disabled}
        onClick={onSelect}
        ref={ref}
        type="button"
      >
        {text}
      </button>
    </Tooltip>
  );
};

export default OutlineNavItem;
