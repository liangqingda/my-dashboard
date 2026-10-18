import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import {
  deployService,
  fetchServices,
  restartService,
  startService,
  stopService,
} from '@/features/services/api';
import { ServicesContext } from '@/features/services/context';
import type { ServiceStatus } from '@/features/services/types';

export type ServiceAction = 'start' | 'stop' | 'restart' | 'deploy';

export type ServiceBusy = Partial<Record<string, ServiceAction>>;

export type ServiceActivity = {
  id: string;
  serviceName: string;
  label: string;
  at: string;
  success: boolean;
};

export type UseServicesResult = {
  services: ServiceStatus[];
  loading: boolean;
  refreshing: boolean;
  agentOnline: boolean;
  error: string | null;
  lastUpdated: string | null;
  activity: ServiceActivity[];
  busy: ServiceBusy;
  refresh: () => Promise<void>;
  start: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  restart: (id: string) => Promise<void>;
  deploy: (id: string) => Promise<void>;
};

export const isPrimaryBusy = (busy: ServiceBusy, id: string): boolean =>
  busy[id] === 'start' || busy[id] === 'restart';

export const isStopBusy = (busy: ServiceBusy, id: string): boolean =>
  busy[id] === 'stop';
const LABELS: Record<ServiceAction, string> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  deploy: '部署',
};
const ACTIVITY_KEY = 'dashboard-activity';

const loadActivity = (): ServiceActivity[] => {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(ACTIVITY_KEY) ?? '[]',
    );

    if (!Array.isArray(saved)) {
      return [];
    }

    return (saved as unknown[])
      .filter((item): item is ServiceActivity => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        return (
          'id' in item &&
          typeof item.id === 'string' &&
          'serviceName' in item &&
          typeof item.serviceName === 'string' &&
          'label' in item &&
          typeof item.label === 'string' &&
          'at' in item &&
          typeof item.at === 'string' &&
          Number.isFinite(Date.parse(item.at)) &&
          'success' in item &&
          typeof item.success === 'boolean'
        );
      })
      .slice(0, 8);
  } catch {
    return [];
  }
};

/** Shared by the header, overview and management page. */
export function useServicesController(): UseServicesResult {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [busy, setBusy] = useState<ServiceBusy>({});
  const [activity, setActivity] = useState(loadActivity);
  const locks = useRef(new Set<string>());
  const pending = useRef<Promise<void> | undefined>(undefined);
  const outcomes = useRef<Partial<Record<string, string>>>({});
  const record = useCallback(
    (serviceName: string, label: string, success: boolean) => {
      setActivity((current) =>
        [
          {
            id: crypto.randomUUID(),
            serviceName,
            label,
            success,
            at: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 8),
      );
    },
    [],
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    } catch {
      /* Storage is optional. */
    }
  }, [activity]);

  const refresh = useCallback((): Promise<void> => {
    if (pending.current) {
      return pending.current;
    }

    const load = async () => {
      setRefreshing(true);

      try {
        const list = await fetchServices();

        setServices(list);
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
        setError(err instanceof Error ? err.message : '无法连接本机服务');
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

  const tracking =
    services.some(
      (service) => service.deploying || service.build === 'starting',
    ) || Object.keys(busy).length > 0;

  useEffect(() => {
    let disposed = false;
    let timer: number;
    const idleInterval = agentOnline ? 5000 : 10_000;
    const interval = tracking ? 1000 : idleInterval;

    const tick = async () => {
      if (document.visibilityState === 'visible') {
        await refresh();
      }

      if (!disposed) {
        timer = window.setTimeout(() => void tick(), interval);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    timer = window.setTimeout(() => void tick(), 0);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh, tracking, agentOnline]);

  const runAction = useCallback(
    async (id: string, action: ServiceAction) => {
      if (!agentOnline || locks.current.has(id)) {
        return;
      }

      locks.current.add(id);
      setBusy((current) => ({ ...current, [id]: action }));
      const serviceName =
        services.find((service) => service.id === id)?.name ?? id;
      const label = LABELS[action];

      try {
        if (action === 'stop') {
          const result = await stopService(id);

          if (!result.stopped || result.remaining?.length) {
            throw new Error('服务仍在运行，请检查日志后重试');
          }
        } else if (action === 'start' || action === 'restart') {
          const result =
            action === 'start'
              ? await startService(id)
              : await restartService(id);

          if (
            !result.started &&
            !('alreadyRunning' in result && result.alreadyRunning)
          ) {
            throw new Error('服务尚未就绪，请检查日志');
          }
        } else {
          const result = await deployService(id);

          if (!result.deploying) {
            throw new Error('部署未开始，请检查日志');
          }
        }

        record(
          serviceName,
          action === 'deploy' ? '开始部署' : `${label}成功`,
          true,
        );

        if (action !== 'deploy') {
          notifications.show({
            title: `${label}成功`,
            message: `「${serviceName}」${label}成功`,
            color: 'teal',
            autoClose: 4000,
          });
        }
      } catch (err) {
        record(serviceName, `${label}失败`, false);
        notifications.show({
          title: `${label}失败`,
          message: err instanceof Error ? err.message : '请稍后重试',
          color: 'red',
          autoClose: false,
        });
      } finally {
        // Drain a snapshot begun before the mutation, then read the resulting state.
        if (pending.current) {
          await pending.current;
        }

        await refresh();
        locks.current.delete(id);
        setBusy((current) => {
          const next = { ...current };

          delete next[id];

          return next;
        });
      }
    },
    [agentOnline, services, refresh, record],
  );
  const start = useCallback(
    (id: string) => runAction(id, 'start'),
    [runAction],
  );
  const stop = useCallback((id: string) => runAction(id, 'stop'), [runAction]);
  const restart = useCallback(
    (id: string) => runAction(id, 'restart'),
    [runAction],
  );
  const deploy = useCallback(
    (id: string) => runAction(id, 'deploy'),
    [runAction],
  );

  return {
    services,
    loading,
    refreshing,
    agentOnline,
    error,
    lastUpdated,
    activity,
    busy,
    refresh,
    start,
    stop,
    restart,
    deploy,
  };
}

export function useServices(): UseServicesResult {
  const value = useContext(ServicesContext);

  if (!value) {
    throw new Error('useServices requires ServicesProvider');
  }

  return value;
}
