/**
 * 标题导航的单条：可点击标题文本 + 右侧折叠图标（有子标题时）。
 * 省略号与「只在被截断时才弹 tip」交给公共组件 TruncatedText。
 */

import { IconChevronDown } from '@tabler/icons-react';

import TruncatedText from '@/components/TruncatedText';
import { cx } from '@/utils/cx';

import type { OutlineNavItemProps } from '../../types';

import { LEVEL_CLASS } from './constants';

import styles from './index.scss';

const OutlineNavItem = ({
  disabled,
  expanded,
  hasChildren,
  level,
  onSelect,
  onToggle,
  text,
}: OutlineNavItemProps) => (
  <div className={cx(styles.row, LEVEL_CLASS[level])}>
    <TruncatedText
      className={styles.item}
      disabled={disabled}
      onClick={onSelect}
      text={text}
    />
    {hasChildren ? (
      <button
        aria-expanded={expanded}
        aria-label={expanded ? '收起子标题' : '展开子标题'}
        className={cx(styles.slot, styles.toggle)}
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        <IconChevronDown
          aria-hidden="true"
          className={cx(styles.chevron, !expanded && styles.collapsed)}
          size={12}
          stroke={1.9}
        />
      </button>
    ) : null}
  </div>
);

export default OutlineNavItem;
