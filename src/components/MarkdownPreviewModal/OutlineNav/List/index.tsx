/**
 * 标题导航的一层：渲染本层节点；某个节点展开时递归渲染它自己的下一层。
 * 深度通过 `depth` 往下传，样式据此给每一层补缩进和左侧引导线。
 */

import { cx } from '@/utils/cx';

import type { OutlineNavListProps } from '../../types';
import OutlineNavItem from '../Item';

import styles from './index.scss';

/** 顶层深度；嵌套层由上一层 +1 传入 */
const TOP_DEPTH = 1;

const OutlineNavList = ({
  className,
  depth = TOP_DEPTH,
  disabled,
  expanded,
  nodes,
  onExpand,
  onSelect,
  onToggle,
}: OutlineNavListProps) => (
  <ul className={cx(styles.nodes, depth > TOP_DEPTH && styles.nested, className)}>
    {nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = hasChildren && expanded.has(node.heading.key);

      return (
        <li key={node.heading.key}>
          <OutlineNavItem
            disabled={disabled}
            expanded={isExpanded}
            hasChildren={hasChildren}
            level={node.heading.level}
            onSelect={() => {
              // 点标题：先跳转，顺手把子标题展开；收起只能点右侧图标
              onSelect(node.index);

              if (hasChildren) {
                onExpand(node.heading.key);
              }
            }}
            onToggle={() => onToggle(node.heading.key)}
            text={node.heading.text}
          />
          {isExpanded ? (
            <OutlineNavList
              depth={depth + 1}
              disabled={disabled}
              expanded={expanded}
              nodes={node.children}
              onExpand={onExpand}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ) : null}
        </li>
      );
    })}
  </ul>
);

export default OutlineNavList;
