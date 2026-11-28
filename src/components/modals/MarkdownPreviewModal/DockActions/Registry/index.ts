/**
 * 页面弹窗登记给程序坞窗口的 Markdown 操作表：按条目 id 存，外部 store 驱动订阅。
 *
 * 页面卸载时**不立刻丢**：程序坞里的 Markdown 窗还要靠这份能力恢复编辑、筛选、刷新与删除，
 * 否则换页后 header 会少一排按钮。只保留最近若干份，避免长期打开很多篇时闭包与正文常驻。
 */

import type { MarkdownDockActions } from '../../types';

/** 最多保留多少篇的操作能力：与程序坞条目上限同一量级，超出按最近登记顺序淘汰 */
const MAX_MARKDOWN_DOCK_ACTIONS = 16;

const actionsById = new Map<string, MarkdownDockActions>();
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const writeMarkdownDockActions = (
  id: string,
  actions: MarkdownDockActions,
): void => {
  if (!actionsById.has(id) && actionsById.size >= MAX_MARKDOWN_DOCK_ACTIONS) {
    const oldestId = actionsById.keys().next().value;

    if (oldestId !== undefined) {
      actionsById.delete(oldestId);
    }
  }

  // 重新插入把当前条目挪到末尾：淘汰总是从最久没登记的那一篇开始
  actionsById.delete(id);
  actionsById.set(id, actions);
  emit();
};

/** 把一条已登记的能力标成「页面不在」，保留它最后一次正文与回调，供坞窗继续用自己的后备能力 */
export const markMarkdownDockActionsInactive = (id: string): void => {
  const current = actionsById.get(id);

  if (current === undefined || current.live === false) {
    return;
  }

  actionsById.set(id, { ...current, live: false });
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
