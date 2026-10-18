import { useLocation } from 'react-router';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { IconDashboard, IconServer } from '@tabler/icons-react';

import styles from './index.scss';

type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: typeof IconDashboard;
};

const navItems: NavItem[] = [
  { key: 'overview', label: '概览', to: '/', icon: IconDashboard },
  { key: 'services', label: '服务', to: '/services', icon: IconServer },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <AppShell.Section aria-label="主导航" component="nav" grow>
      <ScrollArea h="100%" scrollbars="y" type="auto">
        <div className={styles.list}>
          {navItems.map(({ key, label, to, icon: Icon }) => (
            <NavLink
              active={location.pathname === to}
              className={styles.link}
              component="a"
              href={to}
              key={key}
              label={label}
              leftSection={<Icon size={16} stroke={1.9} />}
              noWrap
              variant="light"
            />
          ))}
        </div>
      </ScrollArea>
    </AppShell.Section>
  );
};

export default Sidebar;
