/**
 * 最近操作记录：只保存在 sessionStorage，刷新页面后仍在，关掉标签页即清空。
 */

import { useCallback, useEffect, useState } from 'react';

import { ACTIVITY_LIMIT, ACTIVITY_STORAGE_KEY } from '@/services/constants';
import type { ServiceActivity, ServiceActivityState } from '@/services/types';
import { isServiceActivity } from '@/services/utils';

/** 读取历史记录；读不到就按空列表处理 */
const loadActivity = (): ServiceActivity[] => {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(ACTIVITY_STORAGE_KEY) ?? '[]',
    );

    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.filter(isServiceActivity).slice(0, ACTIVITY_LIMIT);
  } catch {
    return [];
  }
};

/** 管理「最近操作」列表并同步到 sessionStorage */
export function useServiceActivity(): ServiceActivityState {
  const [activity, setActivity] = useState(loadActivity);

  useEffect(() => {
    try {
      sessionStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
    } catch {
      /* 存不进去不影响功能 */
    }
  }, [activity]);

  const record = useCallback(
    (serviceName: string, label: string, success: boolean) => {
      setActivity((current) =>
        [
          {
            at: new Date().toISOString(),
            id: crypto.randomUUID(),
            label,
            serviceName,
            success,
          },
          ...current,
        ].slice(0, ACTIVITY_LIMIT),
      );
    },
    [],
  );

  return { activity, record };
}
