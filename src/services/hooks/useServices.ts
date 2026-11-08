/**
 * 服务状态入口：组合取数、最近操作与动作封装，并只在「有操作进行中」时做短跟踪刷新。
 */

import { useContext, useEffect, useMemo } from 'react';

import { ServicesContext } from '@/services/context';
import { TRACKING_REFRESH_INTERVAL } from '@/services/constants';
import { useServiceActions } from '@/services/hooks/useServiceActions';
import { useServiceActivity } from '@/services/hooks/useServiceActivity';
import { useServicesRefresh } from '@/services/hooks/useServicesRefresh';
import type { UseServicesResult } from '@/services/types';

/**
 * 组装服务状态上下文。
 * 空闲时完全不轮询：进入页面、窗口重新可见 / 获得焦点、侧边栏刷新图标各触发一次读取；
 * 只有部署、启动或某个操作正在进行时才按 1 秒跟踪，结束后立刻停。
 */
export function useServicesController(): UseServicesResult {
  const { activity, record } = useServiceActivity();
  const snapshot = useServicesRefresh({ record });
  const { busy, start, stop, restart, deploy } = useServiceActions({
    services: snapshot.services,
    agentOnline: snapshot.agentOnline,
    record,
    refreshAfterSettled: snapshot.refreshAfterSettled,
  });

  const tracking = useMemo(
    () =>
      snapshot.services.some(
        (service) => service.deploying || service.build === 'starting',
      ) || Object.keys(busy).length > 0,
    [snapshot.services, busy],
  );

  const { refresh } = snapshot;

  useEffect(() => {
    if (!tracking) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, TRACKING_REFRESH_INTERVAL);

    return () => window.clearInterval(timer);
  }, [tracking, refresh]);

  return {
    services: snapshot.services,
    loading: snapshot.loading,
    refreshing: snapshot.refreshing,
    agentOnline: snapshot.agentOnline,
    error: snapshot.error,
    lastUpdated: snapshot.lastUpdated,
    activity,
    busy,
    refresh,
    start,
    stop,
    restart,
    deploy,
  };
}

/** 读取服务状态上下文；必须在 ServicesProvider 内使用 */
export function useServices(): UseServicesResult {
  const value = useContext(ServicesContext);

  if (!value) {
    throw new Error('useServices requires ServicesProvider');
  }

  return value;
}
