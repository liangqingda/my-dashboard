import { ActionIcon, Title, Tooltip } from '@mantine/core';
import { IconMaximize, IconRefresh } from '@tabler/icons-react';

import { usePageFullscreen } from '@/layouts/BasicLayout/PageFullscreen';
import { cx } from '@/utils/cx';
import { requestPageRefresh } from '@/utils/page-refresh';

import type { MenuContentLayoutProps } from './types';

import styles from './index.scss';

/**
 * 菜单内容页的统一外壳：统一的 14px 12px 内边距、统一的标题排版，
 * 以及「标题 + 内容」的纵向结构。菜单页面不再各自写页面内边距与标题样式，
 * 避免页面之间出现间距分叉。
 *
 * 标题右侧固定放「刷新当前页面」与「全屏查看」两个图标按钮：
 * 刷新只广播 `app:page-refresh` 事件，由页面自己重新取数；全屏状态由 `BasicLayout` 持有。
 * 页面自己的按钮（如服务页「重启 agent」）通过 `actions` 传入，排在这两个按钮之前。
 */
const MenuContentLayout = ({
  actions,
  children,
  fill = false,
  title,
}: MenuContentLayoutProps) => {
  const { enterFullscreen, fullscreen } = usePageFullscreen();

  return (
    <div className={cx(styles.page, fill && styles.fill)}>
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
          {fullscreen ? null : (
            <Tooltip label="全屏查看当前页面" withArrow>
              <ActionIcon
                aria-label="全屏查看当前页面"
                className={styles.iconButton}
                onClick={enterFullscreen}
                size="sm"
                variant="subtle"
              >
                <IconMaximize size={16} stroke={1.9} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
};

export default MenuContentLayout;
