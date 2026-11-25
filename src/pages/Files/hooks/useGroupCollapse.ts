import { useCallback, useState } from 'react';

import type { EntryGroupKey } from '../types';

/**
 * 分组折叠状态：只留在会话内，不持久化；网格与表格共用同一份收起集合。
 * 收起哪几段由调用方渲染时读取，切换只改集合本身。
 */
export const useGroupCollapse = () => {
  const [collapsedGroups, setCollapsedGroups] = useState<
    ReadonlySet<EntryGroupKey>
  >(new Set());

  const toggleGroup = useCallback((key: EntryGroupKey) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  return { collapsedGroups, toggleGroup };
};
