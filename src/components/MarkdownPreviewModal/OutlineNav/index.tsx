/**
 * 弹窗左侧固定的标题目录 sidebar：点击某条标题滚动到正文对应位置，
 * 滚动正文时反过来高亮当前所在的那一节。
 * 目录自己占一列、自身滚动，不跟正文一起滚走，也不需要外部拿正文高度来封顶。
 * 有子标题的节点在标题右侧带折叠图标：常规只展开第一个节点和它下面的第一个子级，
 * 全屏预览时默认全部展开（列也放宽）；点标题只会「展开」不会「收起」，收起只能由右侧图标触发。
 * 列宽可以拖右边缘调整，拖到接近左边就收起成一条窄轨（见 `hooks/useOutlineWidth`）。
 */

import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { IconChevronRight } from '@tabler/icons-react';

import { cx } from '@/utils/cx';
import { buildMarkdownOutlineTree } from '@/utils/markdown-outline';
import type { MarkdownOutlineNode } from '@/utils/markdown-outline';

import type { OutlineNavProps } from '../types';

import OutlineNavList from './List';
import { useOutlineWidth } from './hooks/useOutlineWidth';
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
 * 全屏预览时的基准：整棵树全部展开。
 * 全屏是为了看清整篇的脉络，逐节点点开太慢，所以默认全开；用户仍可逐个收起。
 */
const allExpandedKeys = (nodes: MarkdownOutlineNode[]): ReadonlySet<string> => {
  const keys = new Set<string>();

  const walk = (level: MarkdownOutlineNode[]) => {
    for (const node of level) {
      keys.add(node.heading.key);
      walk(node.children);
    }
  };

  walk(nodes);

  return keys;
};

/**
 * 用户对展开态做过的手动改动：`base` 记录这份表属于哪一棵树（也就是哪一篇文档），
 * `fullscreen` 记录它属于哪一种默认展开策略（常规两级 / 全屏全展开）。
 * 树或策略换了就当作没动过，不必用 effect 去重置状态——
 * 节点 key 带标题文本，不清掉会漏出上一篇的展开态。
 */
type ExpansionState = {
  /** 这份覆写表对应的树 */
  base: MarkdownOutlineNode[];
  /** 这份覆写表对应的默认展开策略 */
  fullscreen: boolean;
  /** 显式改过的节点：true 展开、false 收起；没记录的走默认值 + 当前小节祖先链 */
  overrides: ReadonlyMap<string, boolean>;
};

/** 只有一个标题时没有导航价值，直接不渲染 */
const OutlineNav = ({
  activeIndex,
  headings,
  disabled,
  fullscreen,
  onSelect,
}: OutlineNavProps) => {
  const tree = useMemo(() => buildMarkdownOutlineTree(headings), [headings]);
  const navRef = useRef<HTMLDivElement | null>(null);
  const { width, collapsed, handleProps } = useOutlineWidth(navRef);
  /** 默认展开集合要在下面的派生里当基准，算一次缓存住：全屏全开，常规只开前两层 */
  const defaultExpanded = useMemo(
    () => (fullscreen ? allExpandedKeys(tree) : defaultExpandedKeys(tree)),
    [fullscreen, tree],
  );
  const [expansion, setExpansion] = useState<ExpansionState>(() => ({
    base: tree,
    fullscreen,
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
    const sameDocument =
      expansion.base === tree && expansion.fullscreen === fullscreen;
    const overrides = sameDocument ? expansion.overrides : EMPTY_OVERRIDES;
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
  }, [activePath, defaultExpanded, expansion, fullscreen, tree]);

  if (headings.length <= 1) {
    return null;
  }

  /** 记一条显式改动；换文档或换展开策略（进出全屏）就丢掉上一份记录 */
  const setOverride = (key: string, flag: boolean) => {
    setExpansion((current) => {
      const sameDocument =
        current.base === tree && current.fullscreen === fullscreen;
      const base = sameDocument ? current.overrides : EMPTY_OVERRIDES;

      if (base.get(key) === flag) {
        return current;
      }

      const next = new Map(base);

      next.set(key, flag);

      return { base: tree, fullscreen, overrides: next };
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
      className={cx(
        styles.nav,
        fullscreen && styles.navFullscreen,
        collapsed && styles.navCollapsed,
        disabled && styles.disabled,
      )}
      ref={navRef}
      style={
        width === null
          ? undefined
          : ({ '--outline-width': `${width}px` } as CSSProperties)
      }
    >
      <div className={styles.inner}>
        <span className={styles.label}>目录</span>
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
      <div
        aria-label={collapsed ? '展开标题目录' : '拖拽调整目录宽度'}
        aria-orientation="vertical"
        className={cx(styles.handle, collapsed && styles.handleCollapsed)}
        role="separator"
        tabIndex={0}
        {...handleProps}
      >
        {collapsed ? <IconChevronRight aria-hidden size={13} /> : null}
      </div>
    </div>
  );
};

export default OutlineNav;
