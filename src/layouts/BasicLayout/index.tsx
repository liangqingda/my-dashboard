import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@mantine/core';

import { useDock } from '@/dock/hooks/useDock';
import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';
import { isTypingTarget } from '@/utils/typing-target';

import type { BasicLayoutProps } from './types';

import styles from './index.scss';

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const [opened, setOpened] = useState(false);
  const dock = useDock();
  const dockRef = useRef(dock);

  // 键位在 window 上只挂一次，回调里读最新程序坞状态；渲染阶段不写 ref
  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

  /*
   * Esc 收起移动端侧栏；⌘M 收起当前最上层可收起的弹窗；
   * ⌘← / ⌘→ 按程序坞顺序切上一条 / 下一条（键位统一挂在外壳上）。
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpened(false);
        return;
      }

      if (!event.metaKey || event.repeat) {
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        if (dockRef.current.minimizeTop()) {
          event.preventDefault();
        }

        return;
      }

      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !isTypingTarget(event.target)
      ) {
        if (dockRef.current.stepWindow(event.key === 'ArrowLeft' ? -1 : 1)) {
          event.preventDefault();
        }
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
