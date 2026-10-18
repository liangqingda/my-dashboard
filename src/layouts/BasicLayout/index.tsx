import { AppShell } from '@mantine/core';

import type { ReactNode } from 'react';

import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import styles from './index.scss';

type BasicLayoutProps = {
  children: ReactNode;
};

const BasicLayout = ({ children }: BasicLayoutProps) => (
  <AppShell
    className={styles.app}
    header={{ height: 56 }}
    navbar={{ breakpoint: 'sm', width: 260 }}
    padding={0}
    withBorder={false}
  >
    <AppShell.Header className={styles.header}>
      <Header />
    </AppShell.Header>
    <AppShell.Navbar className={styles.navbar}>
      <Sidebar />
    </AppShell.Navbar>
    <AppShell.Main className={styles.main}>
      <div className={styles.content}>{children}</div>
    </AppShell.Main>
  </AppShell>
);

export default BasicLayout;
