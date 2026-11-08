import { Link, useLocation } from 'react-router';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { IconLanguage, IconServer } from '@tabler/icons-react';

import type { NavItem, SidebarProps } from './types';

import styles from './index.scss';

const navItems: NavItem[] = [
  { key: 'services', label: '服务', to: '/services', icon: IconServer },
  { key: 'english', label: '英语练习', to: '/english', icon: IconLanguage },
];

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();

  return (
    <AppShell.Section aria-label="主导航" component="nav" grow>
      <ScrollArea h="100%" scrollbars="y" type="auto">
        <div className={styles.list}>
          {navItems.map(({ key, label, to, icon: Icon }) => {
            const active = location.pathname === to;

            return (
              <NavLink
                active={active}
                aria-current={active ? 'page' : undefined}
                className={styles.link}
                component={Link}
                key={key}
                label={label}
                leftSection={<Icon size={16} stroke={1.9} />}
                noWrap
                onClick={onNavigate}
                to={to}
                variant="light"
              />
            );
          })}
        </div>
      </ScrollArea>
    </AppShell.Section>
  );
};

export default Sidebar;
