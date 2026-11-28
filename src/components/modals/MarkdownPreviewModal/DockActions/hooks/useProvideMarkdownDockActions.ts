/**
 * 页面里的 Markdown 预览把当前能力登记到程序坞：
 * 只在页面弹窗这一侧登记，程序坞窗口自己不再写回，避免两份互相覆盖。
 *
 * 页面卸载**不撤销登记**：程序坞里的 Markdown 窗不是只读快照，还要继续用同一套
 * 编辑 / 筛选 / 刷新 / 删除回调；清理时只把 `live` 改成 false，窗口据此判断
 * 能不能继续用页面状态，还是改走自己读写笔记的后备能力。
 */

import { useEffect } from 'react';

import type { MarkdownDockActions } from '../../types';
import {
  markMarkdownDockActionsInactive,
  writeMarkdownDockActions,
} from '../Registry';

export const useProvideMarkdownDockActions = (
  id: string | undefined,
  actions: MarkdownDockActions,
): void => {
  useEffect(() => {
    if (id === undefined) {
      return;
    }

    writeMarkdownDockActions(id, { ...actions, live: true });
  }, [actions, id]);

  useEffect(() => {
    if (id === undefined) {
      return undefined;
    }

    return () => markMarkdownDockActionsInactive(id);
  }, [id]);
};
