/**
 * Markdown 折叠块（`<details>` + `<summary>`）：标题行常显，正文按需展开。
 *
 * 预览弹窗通过 react-markdown 的 `components.details` 映射到这里，所以不要再在别处
 * 复制一套折叠样式；也能脱离 Markdown 单独使用——传 `summary` + `children` 即可。
 */

import { useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { MarkdownDetailsProps } from './types';
import { splitDetailsChildren } from './utils';

import styles from './index.scss';

const MarkdownDetails = ({
  children,
  defaultOpen = false,
  open,
  summary,
}: MarkdownDetailsProps) => {
  const [expanded, setExpanded] = useState(defaultOpen || Boolean(open));
  /** 没有显式 summary 时，从 details 的原始子节点里取 `<summary>`，剩下的就是正文 */
  const parts = splitDetailsChildren(children);
  const heading = summary ?? parts.summary;

  return (
    <div className={cx(styles.root, expanded && styles.rootOpen)}>
      <button
        aria-expanded={expanded}
        className={styles.toggle}
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <IconChevronRight
          className={cx(styles.chevron, expanded && styles.chevronOpen)}
          size={13}
          stroke={2}
        />
        <span className={styles.summary}>{heading}</span>
      </button>
      {expanded ? <div className={styles.content}>{parts.body}</div> : null}
    </div>
  );
};

export default MarkdownDetails;
