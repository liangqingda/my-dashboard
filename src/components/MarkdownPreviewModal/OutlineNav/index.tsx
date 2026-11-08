/**
 * 弹窗左上角、浮在框体之外的标题导航：点击某条标题滚动到正文对应位置。
 * 有子标题的节点在标题右侧带折叠图标，默认展开第一个节点和它下面的第一个子级；
 * 点标题只会「展开」不会「收起」，收起只能由右侧图标触发。
 */

import { useMemo, useState } from 'react';

import { cx } from '@/utils/cx';
import { buildMarkdownOutlineTree } from '@/utils/markdown-outline';
import type { MarkdownOutlineNode } from '@/utils/markdown-outline';

import type { OutlineNavProps } from '../types';

import OutlineNavList from './List';

import styles from './index.scss';

/** 稳定的空集合：没有可展开节点时用它，避免每次渲染换新引用 */
const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

/**
 * 默认展开的两层：顶层第一个带子标题的节点，加上它下面的第一个子级。
 * 只需扫顶层——更深的节点要存在，它的某一层祖先必然也带子标题。
 */
const defaultExpandedKeys = (
  nodes: MarkdownOutlineNode[],
): ReadonlySet<string> => {
  const first = nodes.find((node) => node.children.length > 0);

  if (!first) {
    return EMPTY_EXPANDED;
  }

  const [firstChild] = first.children;

  return new Set([first.heading.key, firstChild.heading.key]);
};

/**
 * 展开状态：`base` 记录这份集合属于哪一棵树（也就是哪一篇文档）。
 * 文档换了（树换了引用）就直接回到默认值，不必用 effect 去重置状态——
 * 节点 key 带标题文本，不清掉会漏出上一篇的展开态。
 */
type ExpansionState = {
  /** 这份展开集合对应的树 */
  base: MarkdownOutlineNode[];
  /** 用户点出来的展开集合 */
  value: ReadonlySet<string>;
};

/** 只有一个标题时没有导航价值，直接不渲染 */
const OutlineNav = ({
  headings,
  disabled,
  onSelect,
  maxHeight,
}: OutlineNavProps) => {
  const tree = useMemo(() => buildMarkdownOutlineTree(headings), [headings]);
  /** 默认展开集合很小，直接算，不必 memo */
  const defaultExpanded = defaultExpandedKeys(tree);
  const [expansion, setExpansion] = useState<ExpansionState>(() => ({
    base: tree,
    value: defaultExpanded,
  }));
  const expanded = expansion.base === tree ? expansion.value : defaultExpanded;

  if (headings.length <= 1) {
    return null;
  }

  /** 只在已收起时展开；点标题用这个，不会把已展开的节点收起来 */
  const expand = (key: string) => {
    setExpansion((current) => {
      const from = current.base === tree ? current.value : defaultExpanded;

      if (from.has(key)) {
        return { base: tree, value: from };
      }

      const next = new Set(from);

      next.add(key);

      return { base: tree, value: next };
    });
  };

  /** 图标按钮用这个：展开 / 收起都行 */
  const toggle = (key: string) => {
    setExpansion((current) => {
      const from = current.base === tree ? current.value : defaultExpanded;
      const next = new Set(from);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return { base: tree, value: next };
    });
  };

  return (
    <div
      aria-disabled={disabled}
      className={cx(styles.nav, disabled && styles.disabled)}
      style={maxHeight === null ? undefined : { maxHeight }}
    >
      <OutlineNavList
        className={styles.list}
        disabled={disabled}
        expanded={expanded}
        nodes={tree}
        onExpand={expand}
        onSelect={onSelect}
        onToggle={toggle}
      />
    </div>
  );
};

export default OutlineNav;
