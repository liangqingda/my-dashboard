import { Title } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { MenuContentLayoutProps } from './types';

import styles from './index.scss';

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
  <div className={cx(styles.page, fill && styles.fill)}>
    <div className={styles.titleBar}>
      <Title className={styles.title} order={2}>
        {title}
      </Title>
    </div>
    <div className={styles.body}>{children}</div>
  </div>
);

export default MenuContentLayout;
