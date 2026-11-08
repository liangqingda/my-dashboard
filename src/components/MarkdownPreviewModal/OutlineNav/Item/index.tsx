/**
 * 标题导航的单条：折叠按钮（有子标题时）+ 可点击标题文本。
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
    ) : (
      // 没有子标题也占住这一格，同一层的标题文字才对得齐
      <span aria-hidden="true" className={styles.slot} />
    )}
    <TruncatedText
      className={styles.item}
      disabled={disabled}
      onClick={onSelect}
      text={text}
    />
  </div>
);

export default OutlineNavItem;
