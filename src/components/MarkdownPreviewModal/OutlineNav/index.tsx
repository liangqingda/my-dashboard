/**
 * 弹窗左上角、浮在框体之外的标题导航：点击某条标题滚动到正文对应位置。
 */

import { cx } from '@/utils/cx';

import type { OutlineNavProps } from '../types';

import styles from './index.scss';

/** 只有一个标题时没有导航价值，直接不渲染 */
const OutlineNav = ({ headings, disabled, onSelect }: OutlineNavProps) => {
  if (headings.length <= 1) {
    return null;
  }

  return (
    <div
      aria-disabled={disabled}
      className={cx(styles.nav, disabled && styles.disabled)}
    >
      <ul className={styles.list}>
        {headings.map((heading, index) => (
          <li key={heading.key}>
            <button
              className={styles.item}
              data-level={heading.level}
              disabled={disabled}
              onClick={() => onSelect(index)}
              type="button"
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OutlineNav;
