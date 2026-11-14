import { useEffect, useState } from 'react';
import { AppShell } from '@mantine/core';

import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import type { BasicLayoutProps } from './types';

import styles from './index.scss';

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const [opened, setOpened] = useState(false);

  // Esc 只负责收起移动端侧栏；页面级全屏由 MenuContentLayout 自己监听退出
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setOpened(false);
    };

    window.addEventListener('keydown', close);

    return () => window.removeEventListener('keydown', close);
  }, []);

  return (
    <AppShell
      className={styles.app}
      header={{ height: 44 }}
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
