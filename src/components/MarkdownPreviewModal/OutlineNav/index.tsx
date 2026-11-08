/**
 * 弹窗左上角、浮在框体之外的标题导航：点击某条标题滚动到正文对应位置。
 */

import type { MarkdownOutlineHeading } from '@/utils/markdown-outline';
import { cx } from '@/utils/cx';

import styles from './index.scss';

type OutlineNavProps = {
  /** 文档内标题列表 */
  headings: MarkdownOutlineHeading[];
  /** 编辑态下置灰不可点 */
  disabled: boolean;
  /** 点击第几条标题 */
  onSelect: (index: number) => void;
};

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
