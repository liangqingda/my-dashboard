/**
 * 快捷命令清单的取数与分组：页面弹窗与程序坞后备窗口共用同一份状态与口径。
 *
 * `enabled` 为 false 时不取数（页面弹窗还没打开）；后备窗口挂载即视为已打开，恒传 true。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchCliCommands } from '@/services/api';
import { useServices } from '@/services/hooks/useServices';
import type { CliCommand } from '@/services/types';
import { getErrorMessage } from '@/utils/error';

import { groupCommands } from '../utils/group-commands';
import type { CliCommandGroup } from '../utils/group-commands';

/** hook 对外的完整状态与动作 */
export type CliCommandsState = {
  /** agent 是否在线；离线时清单不可取 */
  agentOnline: boolean;
  /** 正在拉取清单 */
  loading: boolean;
  /** 读取失败的原因；null 表示没失败 */
  error: string | null;
  /** 按分组归好堆的命令 */
  groups: CliCommandGroup[];
  /** 重新拉取一次最新清单 */
  refresh: () => void;
};

export const useCliCommands = (enabled: boolean): CliCommandsState => {
  const { agentOnline } = useServices();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState<CliCommand[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !agentOnline) {
      return undefined;
    }

    let alive = true;

    const load = async () => {
      setLoading(true);

      try {
        const result = await fetchCliCommands();

        if (!alive) {
          return;
        }

        setCommands(result.commands);
        setError(null);
      } catch (err) {
        if (alive) {
          setError(getErrorMessage(err, '读取 ~/.zshrc 失败'));
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    const timerId = window.setTimeout(() => void load(), 0);

    return () => {
      alive = false;
      window.clearTimeout(timerId);
    };
  }, [enabled, agentOnline, revision]);

  const groups = useMemo(() => groupCommands(commands), [commands]);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  return { agentOnline, loading, error, groups, refresh };
};
