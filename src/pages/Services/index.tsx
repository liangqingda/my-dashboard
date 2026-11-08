/**
 * 服务页：展示并启停本机所有已登记服务。
 */

import { useEffect } from 'react';

import { useServices } from '@/services/hooks/useServices';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

import RestartAgentButton from './RestartAgentButton';
import ServicesManager from './ServicesManager';

const Services = () => {
  const { refresh } = useServices();

  /**
   * 页面头部「刷新当前页面」按钮：与页面自身 refresh 共用一条路径（进行中的请求会合并），
   * 把 Promise 交给订阅方，标题栏按钮才能等取数结束再提示结果。
   */
  useEffect(() => onPageRefresh(refresh), [refresh]);

  return (
    <MenuContentLayout actions={<RestartAgentButton />} title="服务">
      <ServicesManager />
    </MenuContentLayout>
  );
};

export default Services;
