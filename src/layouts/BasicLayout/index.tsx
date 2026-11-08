import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { ActionIcon, AppShell } from '@mantine/core';
import { IconMinimize } from '@tabler/icons-react';

import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';
import { cx } from '@/utils/cx';

import { PageFullscreenContext } from './PageFullscreen';
import type { BasicLayoutProps } from './types';

import styles from './index.scss';

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

  const contentClassName = cx(styles.content, fullscreen && styles.contentFullscreen);

  const enterFullscreen = useCallback(() => {
    setOpened(false);
    setFullscreenPath(pathname);
  }, [pathname]);

  const exitFullscreen = () => setFullscreenPath(null);

  // 交给 MenuContentLayout 的头部按钮：状态与进入动作一并透出，随路径切换保持引用稳定
  const fullscreenControls = useMemo(
    () => ({ enterFullscreen, fullscreen }),
    [enterFullscreen, fullscreen],
  );

  return (
    <PageFullscreenContext.Provider value={fullscreenControls}>
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
    </PageFullscreenContext.Provider>
  );
};

export default BasicLayout;
