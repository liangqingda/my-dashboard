/**
 * 服务列表 Hook：轮询拉取所有服务状态，并提供启动 / 停止动作。
 * 状态派生在渲染期完成，不在 effect 中更新派生值。
 */

import { useCallback, useEffect, useState } from 'react';

import {
  fetchServices,
  startService as startServiceApi,
  stopService as stopServiceApi,
} from '@/features/services/api';
import type { ServiceStatus } from '@/features/services/types';

/** 可对服务执行的动作 */
export type ServiceAction = 'start' | 'stop';

export type UseServicesResult = {
  /** 服务状态列表 */
  services: ServiceStatus[];
  /** 首次加载中 */
  loading: boolean;
  /** agent 是否在线（false 表示无法连接） */
  agentOnline: boolean;
  /** 最近一次错误信息 */
  error: string | null;
  /** 正在执行动作的服务 id（用于按钮 loading / 禁用） */
  busyId: string | null;
  /** 立即刷新一次 */
  refresh: () => Promise<void>;
  /** 启动服务 */
  start: (id: string) => Promise<void>;
  /** 停止服务 */
  stop: (id: string) => Promise<void>;
};

/**
 * 订阅本机服务状态。
 * @param pollIntervalMs 轮询间隔，默认 3 秒
 */
export function useServices(pollIntervalMs = 3000): UseServicesResult {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentOnline, setAgentOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchServices();

      setServices(list);
      setAgentOnline(true);
      setError(null);
    } catch (err) {
      setAgentOnline(false);
      setError(err instanceof Error ? err.message : '无法连接本机服务 agent');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const immediate = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollIntervalMs);

    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  const runAction = useCallback(
    async (id: string, action: ServiceAction) => {
      setBusyId(id);

      try {
        if (action === 'start') {
          await startServiceApi(id);
        } else {
          await stopServiceApi(id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `${action} 失败`);
      } finally {
        setBusyId(null);
        await refresh();
      }
    },
    [refresh],
  );

  const start = useCallback((id: string) => runAction(id, 'start'), [runAction]);
  const stop = useCallback((id: string) => runAction(id, 'stop'), [runAction]);

  return { services, loading, agentOnline, error, busyId, refresh, start, stop };
}
