import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { Divider, Title } from '@mantine/core';
import { IconMaximize, IconMinimize, IconRefresh } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { useStoredState } from '@/hooks/useStoredState';
import { cx } from '@/utils/cx';
import { FLAG_CODEC } from '@/utils/local-storage';
import { pageFullscreenKey } from '@/utils/page-fullscreen';

import { usePageActionShortcuts } from './hooks/usePageActionShortcuts';
import { usePageRefresh } from './hooks/usePageRefresh';
import type { MenuContentLayoutProps } from './types';

import styles from './index.scss';

/**
 * 菜单内容页的统一外壳：统一的 14px 12px 内边距、统一的标题排版，
 * 以及「标题 + 内容」的纵向结构。菜单页面不再各自写页面内边距与标题样式，
 * 避免页面之间出现间距分叉。
 *
 * 标题右侧固定放「刷新当前页面」与「全屏 / 退出全屏」两个图标按钮：
 * 刷新通知当前页面重新取数，等取数结束再提示「已刷新 / 失败」，点了立刻转圈给出进行中的反馈；
 * 全屏状态按当前路由记在 localStorage（各菜单页互不影响），刷新页面重新进入后保持上次的状态，
 * 只把页面根元素铺满视口（覆盖顶栏与侧栏），页面内部结构、内容与正常状态完全一致，
 * 点了再点、按 `F` 或全屏时按 Esc 退出。刷新按 `R`、全屏按 `F` 有同一套快捷键。
 * 页面自己的按钮（如服务页「重启 agent」）通过 `actions` 传入，排在这两个按钮之前；
 * 有页面按钮时，它们与内置按钮之间用一条竖向分割线隔开。
 * 标题右侧还可以再带一句 `description`（页面的补充说明，如文件页的剩余可用空间）：
 * 弱色小字、放不下才省略并弹 tip，这段文本的样式与截断统一由本组件决定，页面只拼文案。
 */
const MenuContentLayout = ({
  actions,
  children,
  description,
  fill = false,
  onEscape,
  onNavigateParent,
  onToggleFilter,
  onToggleFavorites,
  title,
}: MenuContentLayoutProps) => {
  /** 刷新按钮的进行中状态与结果提示 */
  const { refreshing, refresh } = usePageRefresh();

  /** 全屏状态按当前路由分开存：每个菜单页各自记住自己上次是否全屏 */
  const { pathname } = useLocation();
  const [fullscreen, setFullscreen] = useStoredState(
    pageFullscreenKey(pathname),
    FLAG_CODEC,
  );

  /** 页面容器：快捷键只响应落点在本页内的按键，弹窗等浮层接管焦点时放行 */
  const pageRef = useRef<HTMLDivElement | null>(null);

  /** 页面级快捷键：`R` 刷新、`F` 切换全屏；页面可选再挂筛选 / 收藏面板与上级目录 */
  usePageActionShortcuts({
    containerRef: pageRef,
    // 全屏时 Esc 归「退出全屏」（下面那支监听），页面自己的 Esc 让位
    onEscape: fullscreen ? undefined : onEscape,
    onNavigateParent,
    onRefresh: refresh,
    onToggleFilter,
    onToggleFavorites,
    onToggleFullscreen: () => setFullscreen(!fullscreen),
  });

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
      ref={pageRef}
    >
      <div className={styles.titleBar}>
        <div className={styles.heading}>
          <Title className={styles.title} order={2}>
            {title}
          </Title>
          {description ? (
            <FreeTruncatedText
              className={styles.description}
              text={description}
            />
          ) : null}
        </div>
        <div className={styles.actions}>
          {actions}
          {actions ? (
            <Divider className={styles.divider} orientation="vertical" />
          ) : null}
          <FreeIconAction
            ariaBusy={refreshing}
            className={cx(refreshing && styles.spinning)}
            label="刷新当前页面"
            onClick={refresh}
            tooltipLabel="刷新当前页面（R）"
          >
            <IconRefresh size={16} stroke={1.9} />
          </FreeIconAction>
          <FreeIconAction
            label={fullscreen ? '退出全屏' : '全屏查看当前页面'}
            onClick={() => setFullscreen(!fullscreen)}
            tooltipLabel={
              fullscreen ? '退出全屏（Esc / F）' : '全屏查看当前页面（F）'
            }
          >
            {fullscreen ? (
              <IconMinimize size={16} stroke={1.9} />
            ) : (
              <IconMaximize size={16} stroke={1.9} />
            )}
          </FreeIconAction>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

export default MenuContentLayout;
