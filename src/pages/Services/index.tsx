/**
 * 服务页：展示并启停本机所有已登记服务。
 */

import { useEffect } from 'react';

import { useServices } from '@/features/services/hooks/useServices';
import ServicesManager from '@/features/services/services-manager';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

const Services = () => {
  const { refresh } = useServices();

  // 侧边栏「刷新」按钮：与 5 秒轮询走同一个 refresh，进行中的请求会被合并
  useEffect(() => onPageRefresh(() => void refresh()), [refresh]);

  return (
    <MenuContentLayout title="服务">
      <ServicesManager />
    </MenuContentLayout>
  );
};

export default Services;
