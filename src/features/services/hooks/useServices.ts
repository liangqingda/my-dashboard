/**
 * 服务列表 Hook：轮询拉取所有服务状态，并提供启动 / 停止 / 重启动作。
 * 状态派生在渲染期完成，不在 effect 中更新派生值。
 *
 * 「执行中」状态（busy）区分动作并保持到服务到达目标状态：
 *   - 启动 / 重启：保持到 running 为 true（成功）或 build 为 fail（失败）
 *   - 停止：保持到 running 为 false
 * 这样按钮 loading 不会因接口瞬间返回而一闪而过，也不会两个按钮同时转圈。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import {
  deployService as deployServiceApi,
  fetchServices,
  startService as startServiceApi,
  stopService as stopServiceApi,
} from '@/features/services/api';
import type { ServiceStatus } from '@/features/services/types';

/** 可对服务执行的动作 */
export type ServiceAction = 'start' | 'stop' | 'restart';

/** 各动作的提示文案 */
const ACTION_LABEL: Record<ServiceAction, { title: string; doneText: string }> = {
  start: { title: '启动', doneText: '已启动' },
  stop: { title: '停止', doneText: '已停止' },
  restart: { title: '重启', doneText: '已重启' },
};

/** 正在执行中的动作（区分服务与动作） */
export type ServiceBusy = { id: string; action: ServiceAction } | null;

export type UseServicesResult = {
  /** 服务状态列表 */
  services: ServiceStatus[];
  /** 首次加载中 */
  loading: boolean;
  /** agent 是否在线（false 表示无法连接） */
  agentOnline: boolean;
  /** 最近一次错误信息 */
  error: string | null;
  /** 正在执行的动作（用于对应按钮 loading / 禁用） */
  busy: ServiceBusy;
  /** 立即刷新一次 */
  refresh: () => Promise<void>;
  /** 启动服务 */
  start: (id: string) => Promise<void>;
  /** 停止服务 */
  stop: (id: string) => Promise<void>;
  /** 重启服务（编译失败时使用，先停后起） */
  restart: (id: string) => Promise<void>;
  /** 重新部署服务（如部署到 CloudBase）；部署中状态由轮询的 deploying 字段驱动 */
  deploy: (id: string) => Promise<void>;
};

/** 主操作（启动 / 重启）是否执行中 */
export const isPrimaryBusy = (busy: ServiceBusy, id: string): boolean =>
  busy?.id === id && (busy.action === 'start' || busy.action === 'restart');

/** 停止是否执行中 */
export const isStopBusy = (busy: ServiceBusy, id: string): boolean =>
  busy?.id === id && busy.action === 'stop';

/**
 * 订阅本机服务状态。
 * @param pollIntervalMs 轮询间隔，默认 3 秒
 */
export function useServices(pollIntervalMs = 3000): UseServicesResult {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentOnline, setAgentOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ServiceBusy>(null);
  /** 各服务最近一次部署结果（用于检测终态变化，仅在本次会话内提示） */
  const prevDeployOutcomeRef = useRef<
    Record<string, ServiceStatus['deployOutcome'] | undefined>
  >({});

  const refresh = useCallback(async () => {
    try {
      const list = await fetchServices();

      setServices(list);
      setAgentOnline(true);
      setError(null);

      // 部署是异步进程：检测 deployOutcome 从非终态变为终态，用 message 提示结果
      const prevOutcomes = prevDeployOutcomeRef.current;

      list.forEach((service) => {
        const prev = prevOutcomes[service.id];

        prevOutcomes[service.id] = service.deployOutcome;

        if (prev === undefined) {
          return; // 首次加载仅建立基线，不提示
        }

        if (service.deployOutcome === 'success' && prev !== 'success') {
          notifications.show({
            title: '部署成功',
            message: `「${service.name}」已部署到 CloudBase`,
            color: 'teal',
            withCloseButton: true,
            autoClose: false,
          });
        } else if (service.deployOutcome === 'failed' && prev !== 'failed') {
          notifications.show({
            title: '部署失败',
            message: `「${service.name}」部署失败，详见服务日志`,
            color: 'red',
            withCloseButton: true,
            autoClose: false,
          });
        }
      });

      // 目标服务到达终态后清除执行中标记
      setBusy((current) => {
        if (!current) {
          return current;
        }

        const target = list.find((service) => service.id === current.id);

        if (!target) {
          return null;
        }

        const done =
          current.action === 'stop'
            ? !target.running
            : target.running || target.build === 'fail';

        return done ? null : current;
      });
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
      setBusy({ id, action });

      const serviceName = services.find((service) => service.id === id)?.name ?? id;
      const { title, doneText } = ACTION_LABEL[action];

      try {
        if (action === 'start') {
          await startServiceApi(id);
        } else if (action === 'stop') {
          await stopServiceApi(id);
        } else {
          // 重启：先停后起
          await stopServiceApi(id);
          await startServiceApi(id);
        }

        notifications.show({
          title,
          message: `「${serviceName}」${doneText}`,
          color: 'teal',
          withCloseButton: true,
          autoClose: false,
        });
      } catch (err) {
        notifications.show({
          title: `${title}失败`,
          message: err instanceof Error ? err.message : `「${serviceName}」${title}失败`,
          color: 'red',
          withCloseButton: true,
          autoClose: false,
        });
        setBusy(null); // 接口报错，立即结束执行中状态
      }

      // 立即刷新一次，让轮询尽快捕获新的服务状态并据此结束 busy
      await refresh();
    },
    [refresh, services],
  );

  const start = useCallback((id: string) => runAction(id, 'start'), [runAction]);
  const stop = useCallback((id: string) => runAction(id, 'stop'), [runAction]);
  const restart = useCallback((id: string) => runAction(id, 'restart'), [runAction]);

  const deploy = useCallback(
    async (id: string) => {
      const serviceName = services.find((service) => service.id === id)?.name ?? id;

      try {
        const result = await deployServiceApi(id);

        if (result.alreadyDeploying) {
          notifications.show({
            title: '部署中',
            message: `「${serviceName}」已在部署中，请稍候`,
            color: 'blue',
            withCloseButton: true,
            autoClose: false,
          });
        }
        // 部署为异步进程：最终成功/失败由轮询 deployOutcome 变化时提示
      } catch (err) {
        notifications.show({
          title: '部署失败',
          message: err instanceof Error ? err.message : `「${serviceName}」部署失败`,
          color: 'red',
          withCloseButton: true,
          autoClose: false,
        });
      }

      await refresh();
    },
    [refresh, services],
  );

  return {
    services,
    loading,
    agentOnline,
    error,
    busy,
    refresh,
    start,
    stop,
    restart,
    deploy,
  };
}
