import { Title } from '@mantine/core';

import type { ReactNode } from 'react';

import styles from './index.scss';

type MenuContentLayoutProps = {
  /** 页面标题：样式由本组件统一，页面只负责传标题内容 */
  title: ReactNode;
  /** 内容区是否撑满视口高度并禁止外层滚动（滚动交给内部子区域，如英语看板各列） */
  fill?: boolean;
  children: ReactNode;
};

/**
 * 菜单内容页的统一外壳：统一的 14px 12px 内边距、统一的标题排版，
 * 以及「标题 + 内容」的纵向结构。菜单页面不再各自写页面内边距与标题样式，
 * 避免页面之间出现间距分叉。
 */
const MenuContentLayout = ({
  children,
  fill = false,
  title,
}: MenuContentLayoutProps) => (
  <div className={fill ? `${styles.page} ${styles.fill}` : styles.page}>
    <div className={styles.titleBar}>
      <Title className={styles.title} order={2}>
        {title}
      </Title>
    </div>
    <div className={styles.body}>{children}</div>
  </div>
);

export default MenuContentLayout;
