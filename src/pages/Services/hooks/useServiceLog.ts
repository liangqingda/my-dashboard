/**
 * 服务日志：展开面板后按固定间隔读取，收起、离线或切到另一个服务时自动停。
 */

import { useCallback, useEffect, useState } from 'react';

import { clearServiceLog, fetchServiceLog } from '@/services/api';
import type { LogKind } from '@/services/types';
import { getErrorMessage } from '@/utils/error';

import type { ServiceLogState } from '../types';
import { LOG_REFRESH_INTERVAL, LOG_TAIL_LINES } from '../constants';

type Params = {
  /** 服务 id */
  serviceId: string;
  /** 读运行日志还是部署日志 */
  kind: LogKind;
  /** 是否应该读取（展开且在线） */
  enabled: boolean;
};

/** 读取并跟踪单个服务的日志尾巴 */
export function useServiceLog({
  serviceId,
  kind,
  enabled,
}: Params): ServiceLogState {
  const [log, setLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  /** 清空后自增，用来重新启动读取循环 */
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let alive = true;
    let timer: number;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);

      try {
        const result = await fetchServiceLog(
          serviceId,
          LOG_TAIL_LINES,
          kind,
          controller.signal,
        );

        if (alive) {
          setLog(result.log);
          setError(null);
        }
      } catch (err) {
        if (alive) {
          setError(getErrorMessage(err, '日志加载失败'));
        }
      } finally {
        if (alive) {
          setLoading(false);
          timer = window.setTimeout(() => void load(), LOG_REFRESH_INTERVAL);
        }
      }
    };

    timer = window.setTimeout(() => void load(), 0);

    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, serviceId, kind, revision]);

  const clear = useCallback(async (): Promise<void> => {
    setClearing(true);

    try {
      await clearServiceLog(serviceId, kind);
      setLog('');
      setError(null);
      setRevision((current) => current + 1);
    } catch (err) {
      setError(getErrorMessage(err, '日志清理失败'));
    } finally {
      setClearing(false);
    }
  }, [kind, serviceId]);

  return { log, loading, error, clearing, clear };
}
