/**
 * 服务快照取数：合并进行中的请求、页面重新可见时补刷一次、
 * 部署结果发生变化时发通知并写入最近操作。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { fetchServices } from '@/services/api';
import { isSameServiceList } from '@/services/utils';
import type { ServiceStatus } from '@/services/types';
import { getErrorMessage } from '@/utils/error';

/** 记录一条最近操作：服务名 / 文案 / 是否成功 */
type RecordActivity = (
  serviceName: string,
  label: string,
  success: boolean,
) => void;

type Params = {
  /** 部署结果变化时写入最近操作 */
  record: RecordActivity;
};

type ServicesSnapshotState = {
  /** 服务列表快照 */
  services: ServiceStatus[];
  /** 是否还在首次读取 */
  loading: boolean;
  /** 是否有请求正在进行 */
  refreshing: boolean;
  /** 本机 agent 是否可达 */
  agentOnline: boolean;
  /** 最近一次读取失败的原因 */
  error: string | null;
  /** 最近一次成功读取的时间（ISO 8601） */
  lastUpdated: string | null;
  /** 重新读取；进行中的请求直接复用 */
  refresh: () => Promise<void>;
  /** 等动作前可能在飞的那次读取落地，再读一次动作后的状态 */
  refreshAfterSettled: () => Promise<void>;
};

/** 读取服务列表；同一时刻只允许一个请求在飞 */
export function useServicesRefresh({
  record,
}: Params): ServicesSnapshotState {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const pending = useRef<Promise<void> | undefined>(undefined);
  /** 上一次看到的部署结果指纹：用来判断「这次才算部署完成」 */
  const outcomes = useRef<Partial<Record<string, string>>>({});

  const refresh = useCallback((): Promise<void> => {
    if (pending.current) {
      return pending.current;
    }

    const load = async () => {
      setRefreshing(true);

      try {
        const list = await fetchServices();

        // 状态没变就保留旧数组引用，ServiceRow 才能跳过重渲染
        setServices((current) =>
          isSameServiceList(current, list) ? current : list,
        );
        setAgentOnline(true);
        setError(null);
        setLastUpdated(new Date().toISOString());

        list.forEach((service) => {
          const key = `${service.deployOutcome ?? ''}:${service.lastDeployAt ?? ''}`;
          const previous = outcomes.current[service.id];

          outcomes.current[service.id] = key;

          if (
            previous === undefined ||
            previous === key ||
            !service.deployOutcome
          ) {
            return;
          }

          const success = service.deployOutcome === 'success';

          notifications.show({
            title: success ? '部署成功' : '部署失败',
            message: `「${service.name}」${success ? '部署完成' : '部署失败，请查看部署日志'}`,
            color: success ? 'teal' : 'red',
            autoClose: success ? 5000 : false,
          });
          record(service.name, success ? '部署完成' : '部署失败', success);
        });
      } catch (err) {
        setAgentOnline(false);
        setError(getErrorMessage(err, '无法连接本机服务'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    pending.current = load().finally(() => {
      pending.current = undefined;
    });

    return pending.current;
  }, [record]);

  const refreshAfterSettled = useCallback(async (): Promise<void> => {
    if (pending.current) {
      await pending.current;
    }

    await refresh();
  }, [refresh]);

  // 进入页面读一次；之后只在「窗口重新可见 / 获得焦点」时补刷，空闲不轮询
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    void refresh();
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [refresh]);

  return {
    services,
    loading,
    refreshing,
    agentOnline,
    error,
    lastUpdated,
    refresh,
    refreshAfterSettled,
  };
}
