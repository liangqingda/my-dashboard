import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ActionIcon, Title, Tooltip } from '@mantine/core';
import { IconMaximize, IconMinimize, IconRefresh } from '@tabler/icons-react';

import { useStoredState } from '@/hooks/useStoredState';
import { cx } from '@/utils/cx';
import { FLAG_CODEC } from '@/utils/local-storage';
import { pageFullscreenKey } from '@/utils/page-fullscreen';
import { requestPageRefresh } from '@/utils/page-refresh';

import type { MenuContentLayoutProps } from './types';

import styles from './index.scss';

/**
 * 菜单内容页的统一外壳：统一的 14px 12px 内边距、统一的标题排版，
 * 以及「标题 + 内容」的纵向结构。菜单页面不再各自写页面内边距与标题样式，
 * 避免页面之间出现间距分叉。
 *
 * 标题右侧固定放「刷新当前页面」与「全屏 / 退出全屏」两个图标按钮：
 * 刷新只广播 `app:page-refresh` 事件，由页面自己重新取数；
 * 全屏状态按当前路由记在 localStorage（各菜单页互不影响），刷新页面重新进入后保持上次的状态，
 * 只把页面根元素铺满视口（覆盖顶栏与侧栏），页面内部结构、内容与正常状态完全一致，
 * 点了再点或按 Esc 退出。
 * 页面自己的按钮（如服务页「重启 agent」）通过 `actions` 传入，排在这两个按钮之前。
 */
const MenuContentLayout = ({
  actions,
  children,
  fill = false,
  title,
}: MenuContentLayoutProps) => {
  /** 全屏状态按当前路由分开存：每个菜单页各自记住自己上次是否全屏 */
  const { pathname } = useLocation();
  const [fullscreen, setFullscreen] = useStoredState(
    pageFullscreenKey(pathname),
    FLAG_CODEC,
  );

  // 全屏期间才监听 Esc：只在铺满时才有「退出」语义，平时不抢按键
  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    };

    window.addEventListener('keydown', exitOnEscape);

    return () => window.removeEventListener('keydown', exitOnEscape);
  }, [fullscreen, setFullscreen]);

  return (
    <div
      className={cx(
        styles.page,
        fill && styles.fill,
        fullscreen && styles.fullscreen,
      )}
    >
      <div className={styles.titleBar}>
        <Title className={styles.title} order={2}>
          {title}
        </Title>
        <div className={styles.actions}>
          {actions}
          <Tooltip label="刷新当前页面" withArrow>
            <ActionIcon
              aria-label="刷新当前页面"
              className={styles.iconButton}
              onClick={requestPageRefresh}
              size="sm"
              variant="subtle"
            >
              <IconRefresh size={16} stroke={1.9} />
            </ActionIcon>
          </Tooltip>
          <Tooltip
            label={fullscreen ? '退出全屏（Esc）' : '全屏查看当前页面'}
            withArrow
          >
            <ActionIcon
              aria-label={fullscreen ? '退出全屏' : '全屏查看当前页面'}
              className={styles.iconButton}
              onClick={() => setFullscreen(!fullscreen)}
              size="sm"
              variant="subtle"
            >
              {fullscreen ? (
                <IconMinimize size={16} stroke={1.9} />
              ) : (
                <IconMaximize size={16} stroke={1.9} />
              )}
            </ActionIcon>
          </Tooltip>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

export default MenuContentLayout;
