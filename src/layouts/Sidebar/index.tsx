import { Link, useLocation } from 'react-router';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { IconFolder, IconLanguage, IconNotes, IconRepeat, IconServer } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import type { NavGroupItem, NavItem, NavLinkItem, SidebarProps } from './types';

import styles from './index.scss';

/**
 * 侧栏导航：顶层是页面入口；同一类页面收进可展开分组（如「英语」下的笔记 / 知识库），
 * 分组本身不跳转，只是把子页面并到一个入口下。分组与子项的顺序就是展示顺序。
 *
 * 行级外观与预览弹窗的标题目录同一套：hover / 选中都走 `--app-nav-row-*` 令牌
 * （最浅主色底 → 重一档主色底 + 左侧 2px 主色标线），组件库默认的灰底与无标线选中态不用。
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

/** 稳定的 class 映射：链接行与分组行各一份，避免每次渲染换新对象 */
const LINK_CLASS_NAMES = { label: styles.labelText, section: styles.iconSlot };

const GROUP_CLASS_NAMES = {
  children: styles.children,
  label: styles.labelText,
  section: styles.iconSlot,
};

/** 一条可点击的菜单项：当前路由命中即高亮 */
const renderLink = (
  item: NavLinkItem,
  pathname: string,
  onNavigate: () => void,
  nested: boolean,
) => {
  const { key, label, to, icon: Icon } = item;
  const active = pathname === to;

  return (
    <NavLink
      active={active}
      aria-current={active ? 'page' : undefined}
      className={cx(styles.row, nested ? styles.child : styles.parent, active && styles.active)}
      classNames={LINK_CLASS_NAMES}
      component={Link}
      key={key}
      label={label}
      leftSection={<Icon size={nested ? 13 : 15} stroke={1.9} />}
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
      <ScrollArea
        className={styles.scroll}
        h="100%"
        scrollbars="y"
        type="auto"
      >
        <div className={styles.list}>
          {/* 与预览弹窗目录列同一个位置：一行淡色小标签说明这一列是什么 */}
          <span className={styles.legend}>导航</span>
          {navItems.map((item) => {
            if (!isGroup(item)) {
              return renderLink(item, pathname, onNavigate, false);
            }

            const { key, label, icon: Icon, children } = item;

            /*
             * 分组默认展开，子项直接可见；用户仍可点父项收起。
             * 用真实按钮而不是 NavLink 默认的无 href 锚点：后者不进 Tab 序列，键盘用户到不了分组。
             */
            return (
              <NavLink
                childrenOffset={0}
                className={cx(styles.row, styles.group)}
                classNames={GROUP_CLASS_NAMES}
                component="button"
                defaultOpened
                key={key}
                label={label}
                leftSection={<Icon size={16} stroke={1.9} />}
                noWrap
                type="button"
                variant="light"
              >
                {children.map((child) => renderLink(child, pathname, onNavigate, true))}
              </NavLink>
            );
          })}
        </div>
      </ScrollArea>
    </AppShell.Section>
  );
};

export default Sidebar;
