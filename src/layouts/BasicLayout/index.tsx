import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ActionIcon, AppShell } from '@mantine/core';
import { IconMinimize } from '@tabler/icons-react';

import type { ReactNode } from 'react';

import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import styles from './index.scss';

type BasicLayoutProps = {
  children: ReactNode;
};

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const [opened, setOpened] = useState(false);
  const { pathname } = useLocation();
  /**
   * 全屏 = 当前页面内容铺满整个页面（不调用浏览器全屏 API），顶栏与侧栏被内容覆盖。
   * 记下进入全屏时的路由：浏览器前进 / 后退换了页就自然退出全屏。
   */
  const [fullscreenPath, setFullscreenPath] = useState<string | null>(null);
  const fullscreen = fullscreenPath === pathname;

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setOpened(false);
      setFullscreenPath(null);
    };

    window.addEventListener('keydown', close);

    return () => window.removeEventListener('keydown', close);
  }, []);

  const contentClassName = fullscreen
    ? `${styles.content} ${styles.contentFullscreen}`
    : styles.content;

  const enterFullscreen = () => {
    setOpened(false);
    setFullscreenPath(pathname);
  };

  const exitFullscreen = () => setFullscreenPath(null);

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
        <Sidebar
          onEnterFullscreen={enterFullscreen}
          onNavigate={() => setOpened(false)}
        />
      </AppShell.Navbar>
      <AppShell.Main className={styles.main}>
        <div className={contentClassName}>{children}</div>
        {fullscreen ? (
          <ActionIcon
            aria-label="退出全屏"
            className={styles.exitFullscreen}
            onClick={exitFullscreen}
            radius="sm"
            size="md"
            title="退出全屏（Esc）"
            variant="default"
          >
            <IconMinimize size={18} stroke={1.9} />
          </ActionIcon>
        ) : null}
      </AppShell.Main>
    </AppShell>
  );
};

export default BasicLayout;
