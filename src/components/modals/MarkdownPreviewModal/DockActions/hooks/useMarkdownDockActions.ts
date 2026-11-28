/** 程序坞里的 Markdown 窗：按当前条目 id 读取页面登记的能力。 */

import { useSyncExternalStore } from 'react';

import {
  readMarkdownDockActions,
  subscribeMarkdownDockActions,
} from '../Registry';

export const useMarkdownDockActions = (id: string) =>
  useSyncExternalStore(
    subscribeMarkdownDockActions,
    () => readMarkdownDockActions(id),
    () => null,
  );
