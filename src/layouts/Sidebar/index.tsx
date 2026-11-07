import { Link, useLocation } from 'react-router';
import { ActionIcon, AppShell, NavLink, ScrollArea } from '@mantine/core';
import {
  IconDashboard,
  IconLanguage,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react';

import { requestPageRefresh } from '@/utils/page-refresh';

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
  { key: 'english', label: '英语', to: '/english', icon: IconLanguage },
];

const Sidebar = ({ onNavigate }: { onNavigate: () => void }) => {
  const location = useLocation();

  return (
    <AppShell.Section aria-label="主导航" component="nav" grow>
      <ScrollArea h="100%" scrollbars="y" type="auto">
        <div className={styles.list}>
          {navItems.map(({ key, label, to, icon: Icon }) => {
            const active = location.pathname === to;

            return (
              <div className={styles.item} key={key}>
                <NavLink
                  active={active}
                  aria-current={active ? 'page' : undefined}
                  className={styles.link}
                  component={Link}
                  label={label}
                  leftSection={<Icon size={16} stroke={1.9} />}
                  noWrap
                  onClick={onNavigate}
                  rightSection={
                    active ? <span className={styles.refreshSlot} /> : undefined
                  }
                  to={to}
                  variant="light"
                />
                {active ? (
                  <ActionIcon
                    aria-label="刷新当前页面"
                    className={styles.refresh}
                    onClick={requestPageRefresh}
                    radius="sm"
                    size="sm"
                    title="刷新当前页面"
                    variant="subtle"
                  >
                    <IconRefresh size={14} stroke={1.9} />
                  </ActionIcon>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </AppShell.Section>
  );
};

export default Sidebar;
