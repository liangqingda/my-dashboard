/**
 * 标题导航的一层：渲染本层节点；某个节点展开时递归渲染它自己的下一层。
 */

import { cx } from '@/utils/cx';

import type { OutlineNavListProps } from '../../types';
import OutlineNavItem from '../Item';

import styles from './index.scss';

const OutlineNavList = ({
  className,
  disabled,
  expanded,
  nodes,
  onSelect,
  onToggle,
}: OutlineNavListProps) => (
  <ul className={cx(styles.nodes, className)}>
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
            onSelect={() => onSelect(node.index)}
            onToggle={() => onToggle(node.heading.key)}
            text={node.heading.text}
          />
          {isExpanded ? (
            <OutlineNavList
              disabled={disabled}
              expanded={expanded}
              nodes={node.children}
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
