/**
 * 页面里的 Markdown 预览把当前能力登记到程序坞：
 * 只在页面弹窗这一侧登记，程序坞窗口自己不再写回，避免两份互相覆盖。
 */

import { useEffect } from 'react';

import type { MarkdownDockActions } from '../../types';
import {
  clearMarkdownDockActions,
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

    writeMarkdownDockActions(id, actions);
  }, [actions, id]);

  useEffect(() => {
    if (id === undefined) {
      return undefined;
    }

    return () => clearMarkdownDockActions(id, actions);
  }, [actions, id]);
};
