import { useEffect, useState } from 'react';
import { AppShell } from '@mantine/core';

import type { ReactNode } from 'react';

import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import styles from './index.scss';

type BasicLayoutProps = {
  children: ReactNode;
};

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpened(false);
      }
    };

    window.addEventListener('keydown', close);

    return () => window.removeEventListener('keydown', close);
  }, []);

  return (
    <AppShell
      className={styles.app}
      header={{ height: 56 }}
      navbar={{ breakpoint: 'sm', width: 184, collapsed: { mobile: !opened } }}
      padding={0}
      withBorder={false}
    >
      <AppShell.Header className={styles.header}>
        <Header
          menuOpened={opened}
          onToggleMenu={() => setOpened((current) => !current)}
        />
      </AppShell.Header>
      <AppShell.Navbar className={styles.navbar} id="main-navigation">
        <Sidebar onNavigate={() => setOpened(false)} />
      </AppShell.Navbar>
      <AppShell.Main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
};

export default BasicLayout;
