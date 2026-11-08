/**
 * 最近操作记录：只保存在 sessionStorage，刷新页面后仍在，关掉标签页即清空。
 */

import { useCallback, useEffect, useState } from 'react';

import { ACTIVITY_LIMIT, ACTIVITY_STORAGE_KEY } from '@/services/constants';
import type { ServiceActivity } from '@/services/types';

/** 校验 sessionStorage 里存进来的历史记录，坏数据一律丢弃 */
const isServiceActivity = (item: unknown): item is ServiceActivity => {
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
};

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

type ServiceActivityState = {
  /** 本次浏览会话的操作记录，最新的在前 */
  activity: ServiceActivity[];
  /** 记录一条操作 */
  record: (serviceName: string, label: string, success: boolean) => void;
};

/** 管理「最近操作」列表并同步到 sessionStorage */
export function useServiceActivity(): ServiceActivityState {
  const [activity, setActivity] = useState(loadActivity);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        ACTIVITY_STORAGE_KEY,
        JSON.stringify(activity),
      );
    } catch {
      /* 存不进去不影响功能 */
    }
  }, [activity]);

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
        ].slice(0, ACTIVITY_LIMIT),
      );
    },
    [],
  );

  return { activity, record };
}
