/**
 * 服务操作：加锁去重、调用 agent 接口、结果通知、完成后合并读取最新状态。
 */

import { useCallback, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import {
  deployService,
  restartService,
  startService,
  stopService,
} from '@/services/api';
import { ACTION_LABELS } from '@/services/constants';
import type {
  ServiceAction,
  ServiceBusy,
  ServiceStatus,
} from '@/services/types';
import { getErrorMessage } from '@/utils/error';

/** 记录一条最近操作：服务名 / 文案 / 是否成功 */
type RecordActivity = (
  serviceName: string,
  label: string,
  success: boolean,
) => void;

type Params = {
  /** 当前服务列表，用来把 id 还原成展示名称 */
  services: ServiceStatus[];
  /** agent 不可达时不允许操作 */
  agentOnline: boolean;
  /** 动作完成后重新读取状态（先等动作前在飞的那次落地） */
  refreshAfterSettled: () => Promise<void>;
  /** 写入最近操作 */
  record: RecordActivity;
};

type ServiceActions = {
  /** 正在进行中的操作，按 serviceId 索引 */
  busy: ServiceBusy;
  /** 启动服务 */
  start: (id: string) => Promise<void>;
  /** 停止服务 */
  stop: (id: string) => Promise<void>;
  /** 重启服务 */
  restart: (id: string) => Promise<void>;
  /** 部署服务 */
  deploy: (id: string) => Promise<void>;
};

/** 封装服务的启动 / 停止 / 重启 / 部署，同一个服务同一时刻只跑一个操作 */
export function useServiceActions({
  services,
  agentOnline,
  refreshAfterSettled,
  record,
}: Params): ServiceActions {
  const [busy, setBusy] = useState<ServiceBusy>({});
  const locks = useRef(new Set<string>());

  const runAction = useCallback(
    async (id: string, action: ServiceAction) => {
      if (!agentOnline || locks.current.has(id)) {
        return;
      }

      locks.current.add(id);
      setBusy((current) => ({ ...current, [id]: action }));

      const serviceName =
        services.find((service) => service.id === id)?.name ?? id;
      const label = ACTION_LABELS[action];

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

        // 部署结果由后续的状态读取（跟踪刷新）来确认，这里不抢先报成功
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
          message: getErrorMessage(err, '请稍后重试'),
          color: 'red',
          autoClose: false,
        });
      } finally {
        // 动作期间可能有一个更早的读取在飞，等它落地再读，保证拿到动作后的状态
        await refreshAfterSettled();
        locks.current.delete(id);
        setBusy((current) => {
          const next = { ...current };

          delete next[id];

          return next;
        });
      }
    },
    [agentOnline, services, refreshAfterSettled, record],
  );

  const start = useCallback((id: string) => runAction(id, 'start'), [runAction]);
  const stop = useCallback((id: string) => runAction(id, 'stop'), [runAction]);
  const restart = useCallback(
    (id: string) => runAction(id, 'restart'),
    [runAction],
  );
  const deploy = useCallback(
    (id: string) => runAction(id, 'deploy'),
    [runAction],
  );

  return { busy, start, stop, restart, deploy };
}
