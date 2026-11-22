import { Link, useLocation } from 'react-router';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import {
  IconFolder,
  IconLanguage,
  IconNotes,
  IconRepeat,
  IconServer,
} from '@tabler/icons-react';

import type { NavGroupItem, NavItem, NavLinkItem, SidebarProps } from './types';

import styles from './index.scss';

/**
 * 侧栏导航：顶层是页面入口；同一类页面收进可展开分组（如「英语」下的笔记 / 知识库），
 * 分组本身不跳转，只是把子页面并到一个入口下。分组与子项的顺序就是展示顺序。
 */
const navItems: NavItem[] = [
  { key: 'services', label: '服务', to: '/services', icon: IconServer },
  { key: 'files', label: '文件', to: '/files', icon: IconFolder },
  {
    key: 'english',
    label: '英语',
    icon: IconLanguage,
    children: [
      { key: 'english-notes', label: '笔记', to: '/english/notes', icon: IconNotes },
      {
        key: 'english-knowledge-base',
        label: '知识库',
        to: '/english/knowledge-base',
        icon: IconRepeat,
      },
    ],
  },
];

/** 分组与链接共用一个数组类型，渲染时靠 `children` 区分 */
const isGroup = (item: NavItem): item is NavGroupItem => 'children' in item;

/** 一条可点击的菜单项：当前路由命中即高亮 */
const renderLink = (
  item: NavLinkItem,
  pathname: string,
  onNavigate: () => void,
) => {
  const { key, label, to, icon: Icon } = item;
  const active = pathname === to;

  return (
    <NavLink
      active={active}
      aria-current={active ? 'page' : undefined}
      className={styles.child}
      component={Link}
      key={key}
      label={label}
      leftSection={<Icon size={15} stroke={1.9} />}
      noWrap
      onClick={onNavigate}
      to={to}
      variant="light"
    />
  );
};

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { pathname } = useLocation();

  return (
    <AppShell.Section aria-label="主导航" component="nav" grow>
      <ScrollArea h="100%" scrollbars="y" type="auto">
        <div className={styles.list}>
          {navItems.map((item) => {
            if (!isGroup(item)) {
              return renderLink(item, pathname, onNavigate);
            }

            const { key, label, icon: Icon, children } = item;

            // 分组默认展开，子项直接可见；用户仍可点父项收起
            return (
              <NavLink
                childrenOffset={18}
                className={styles.group}
                defaultOpened
                key={key}
                label={label}
                leftSection={<Icon size={16} stroke={1.9} />}
                noWrap
                variant="light"
              >
                {children.map((child) => renderLink(child, pathname, onNavigate))}
              </NavLink>
            );
          })}
        </div>
      </ScrollArea>
    </AppShell.Section>
  );
};

export default Sidebar;
