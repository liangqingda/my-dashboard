/**
 * 弹窗左上角、浮在框体之外的标题导航：点击某条标题滚动到正文对应位置，
 * 滚动正文时反过来高亮当前所在的那一节。
 * 有子标题的节点在标题右侧带折叠图标，默认展开第一个节点和它下面的第一个子级；
 * 点标题只会「展开」不会「收起」，收起只能由右侧图标触发。
 */

import { useMemo, useState } from 'react';

import { cx } from '@/utils/cx';
import { buildMarkdownOutlineTree } from '@/utils/markdown-outline';
import type { MarkdownOutlineNode } from '@/utils/markdown-outline';

import type { OutlineNavProps } from '../types';

import OutlineNavList from './List';
import { findOutlineKeyPath } from './utils';

import styles from './index.scss';

/** 稳定的空集合：没有可展开节点时用它，避免每次渲染换新引用 */
const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

/** 稳定的空覆写表：用户还没动过展开态时用它 */
const EMPTY_OVERRIDES: ReadonlyMap<string, boolean> = new Map();

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
 * 用户对展开态做过的手动改动：`base` 记录这份表属于哪一棵树（也就是哪一篇文档）。
 * 文档换了（树换了引用）就当作没动过，不必用 effect 去重置状态——
 * 节点 key 带标题文本，不清掉会漏出上一篇的展开态。
 */
type ExpansionState = {
  /** 这份覆写表对应的树 */
  base: MarkdownOutlineNode[];
  /** 显式改过的节点：true 展开、false 收起；没记录的走默认值 + 当前小节祖先链 */
  overrides: ReadonlyMap<string, boolean>;
};

/** 只有一个标题时没有导航价值，直接不渲染 */
const OutlineNav = ({
  activeIndex,
  headings,
  disabled,
  onSelect,
  maxHeight,
}: OutlineNavProps) => {
  const tree = useMemo(() => buildMarkdownOutlineTree(headings), [headings]);
  /** 默认展开集合很小，但要在下面的派生里当基准，算一次缓存住 */
  const defaultExpanded = useMemo(() => defaultExpandedKeys(tree), [tree]);
  const [expansion, setExpansion] = useState<ExpansionState>(() => ({
    base: tree,
    overrides: EMPTY_OVERRIDES,
  }));

  /** 当前小节在树上的 key 路径（含自己）；-1 时为空 */
  const activePath = useMemo(
    () => findOutlineKeyPath(tree, activeIndex),
    [activeIndex, tree],
  );

  /**
   * 实际展开集合 = 默认展开 + 用户显式改动 + 当前小节的祖先链。
   *
   * 祖先链在渲染期补上（而不是滚动后写回 state）：父级若被收起，高亮会落在看不见的地方。
   * 用户显式收起的节点不会被这条规则重新掰开——那是用户的决定，要一直保留到他自己再展开。
   */
  const expanded = useMemo(() => {
    const overrides =
      expansion.base === tree ? expansion.overrides : EMPTY_OVERRIDES;
    const next = new Set(defaultExpanded);

    overrides.forEach((flag, key) => {
      if (flag) {
        next.add(key);
      } else {
        next.delete(key);
      }
    });

    for (const key of activePath.slice(0, -1)) {
      if (!overrides.has(key)) {
        next.add(key);
      }
    }

    return next;
  }, [activePath, defaultExpanded, expansion, tree]);

  if (headings.length <= 1) {
    return null;
  }

  /** 记一条显式改动；`base` 换了（换文档）就丢掉上一篇的记录 */
  const setOverride = (key: string, flag: boolean) => {
    setExpansion((current) => {
      const base = current.base === tree ? current.overrides : EMPTY_OVERRIDES;

      if (base.get(key) === flag) {
        return current;
      }

      const next = new Map(base);

      next.set(key, flag);

      return { base: tree, overrides: next };
    });
  };

  /** 只在已收起时展开；点标题用这个，不会把已展开的节点收起来 */
  const expand = (key: string) => {
    if (!expanded.has(key)) {
      setOverride(key, true);
    }
  };

  /** 图标按钮用这个：展开 / 收起都行 */
  const toggle = (key: string) => setOverride(key, !expanded.has(key));

  return (
    <div
      aria-disabled={disabled}
      className={cx(styles.nav, disabled && styles.disabled)}
      style={maxHeight === null ? undefined : { maxHeight }}
    >
      <OutlineNavList
        activeIndex={activeIndex}
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
