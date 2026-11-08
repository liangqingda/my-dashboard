/**
 * 标题导航的单条：可点击标题文本 + 右侧折叠图标（有子标题时）。
 * 被激活时把自己滚进目录的可视范围，长目录里高亮不会藏在滚动区外。
 * 省略号与「只在被截断时才弹 tip」交给公共组件 TruncatedText。
 */

import { useEffect, useRef } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

import TruncatedText from '@/components/TruncatedText';
import { cx } from '@/utils/cx';

import type { OutlineNavItemProps } from '../../types';
import { revealRowInScroller } from '../utils';

import { LEVEL_CLASS } from './constants';

import styles from './index.scss';

const OutlineNavItem = ({
  active,
  disabled,
  expanded,
  hasChildren,
  level,
  onSelect,
  onToggle,
  text,
}: OutlineNavItemProps) => {
  const rowRef = useRef<HTMLDivElement | null>(null);

  /**
   * 只在「刚变成当前小节」时滚一次：布局已提交（父级该展开的也展开完了），
   * 这时量出来的位置才是这一行的真实位置。
   */
  useEffect(() => {
    if (active) {
      revealRowInScroller(rowRef.current);
    }
  }, [active]);

  return (
    <div
      className={cx(styles.row, LEVEL_CLASS[level], active && styles.active)}
      ref={rowRef}
    >
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
};

export default OutlineNavItem;
