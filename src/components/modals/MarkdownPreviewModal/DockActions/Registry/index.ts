/** 页面弹窗登记给程序坞窗口的 Markdown 操作表：按条目 id 存，外部 store 驱动订阅。 */

import type { MarkdownDockActions } from '../../types';

const actionsById = new Map<string, MarkdownDockActions>();
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const writeMarkdownDockActions = (
  id: string,
  actions: MarkdownDockActions,
): void => {
  actionsById.set(id, actions);
  emit();
};

export const clearMarkdownDockActions = (
  id: string,
  actions: MarkdownDockActions,
): void => {
  if (actionsById.get(id) !== actions) {
    return;
  }

  actionsById.delete(id);
  emit();
};

export const readMarkdownDockActions = (
  id: string,
): MarkdownDockActions | null => actionsById.get(id) ?? null;

export const subscribeMarkdownDockActions = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
