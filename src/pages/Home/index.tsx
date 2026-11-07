import { useEffect } from 'react';

import { useServices } from '@/features/services/hooks/useServices';
import ServicesOverview from '@/features/services/services-overview';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

import styles from './index.scss';

const Home = () => {
  const { refresh } = useServices();

  // 侧边栏「刷新」按钮：概览卡片同样重新读取服务状态
  useEffect(() => onPageRefresh(() => void refresh()), [refresh]);

  return (
    <MenuContentLayout title="概览">
      <div className={styles.cards}>
        <ServicesOverview />
      </div>
    </MenuContentLayout>
  );
};

export default Home;
