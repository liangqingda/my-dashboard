import { Text } from '@mantine/core';

import MenuContentLayout from '@/layouts/MenuContentLayout';

import styles from './index.scss';

/**
 * 复习库页：先把菜单入口与空壳立起来，暂不接数据。
 * 后续展示 `../learn-english` 的 learning-records / mastered-learning-records 条目，
 * 取数走 `scripts/vite` 的中间件（见 docs/local-repo-data.md），页面只做数据拼装与状态编排。
 */
const Review = () => (
  <MenuContentLayout title="复习库">
    <Text className={styles.empty} size="sm">
      复习库还没有接数据：这里会展示学习中的记录与已掌握的记录。
    </Text>
  </MenuContentLayout>
);

export default Review;
