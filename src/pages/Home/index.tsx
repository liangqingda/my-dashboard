import { useEffect } from 'react';
import { Stack, Title } from '@mantine/core';

import { useServices } from '@/features/services/hooks/useServices';
import ServicesOverview from '@/features/services/services-overview';
import { onPageRefresh } from '@/utils/page-refresh';

import styles from './index.scss';

const Home = () => {
  const { refresh } = useServices();

  // 侧边栏「刷新」按钮：概览卡片同样重新读取服务状态
  useEffect(() => onPageRefresh(() => void refresh()), [refresh]);

  return (
    <div className={styles.page}>
      <Stack gap="md">
        <Title order={2}>概览</Title>
        <div className={styles.cards}>
          <ServicesOverview />
        </div>
      </Stack>
    </div>
  );
};

export default Home;
