import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@mantine/core';
import type { CSSProperties } from 'react';

import { useDock } from '@/dock/hooks/useDock';
import { dockLayoutVars } from '@/dock/utils/dock-layout';
import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import type { BasicLayoutProps } from './types';

import styles from './index.scss';

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const [opened, setOpened] = useState(false);
  const dock = useDock();
  /** 程序坞停在哪条边，页面就从哪条边让出厚度（见 index.scss 的四条 `--dock-*` 覆盖） */
  const layoutStyle = dockLayoutVars(
    dock.settings.placement,
    dock.reservedThickness,
  ) as CSSProperties;
  const dockRef = useRef(dock);

  // 键位在 window 上只挂一次，回调里读最新程序坞状态；渲染阶段不写 ref
  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

  // Esc 收起移动端侧栏；⌘M 收起当前最上层可收起的弹窗（键位统一挂在外壳上）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpened(false);
        return;
      }

      if (!event.metaKey || event.repeat || event.key.toLowerCase() !== 'm') {
        return;
      }

      if (dockRef.current.minimizeTop()) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <AppShell
      className={styles.app}
      header={{ height: 44 }}
      navbar={{ breakpoint: 'sm', width: 184, collapsed: { mobile: !opened } }}
      padding={0}
      style={layoutStyle}
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
