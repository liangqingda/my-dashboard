/**
 * 恢复窗口的渲染器注册表。
 *
 * 条目里只留可序列化的 kind + 快照；真正的组件按 kind 动态 import，
 * 好处是刷新后不依赖原页面、也不会把阅读窗口的代码塞进首屏包。
 */

import type { ComponentType } from 'react';

import type { DockWindowKind, DockWindowProps } from '../types';

type DockWindowModule = {
  default: ComponentType<DockWindowProps>;
};

const DOCK_WINDOW_LOADERS: Record<
  DockWindowKind,
  () => Promise<DockWindowModule>
> = {
  'markdown-preview': () => import('./MarkdownWindow'),
  'record-detail': () => import('./RecordWindow'),
  'image-preview': () => import('./ImageWindow'),
  'video-preview': () => import('./VideoWindow'),
  'cli-commands': () => import('./CliCommandsWindow'),
  'markdown-section': () => import('./MarkdownSectionWindow'),
};

/** 按窗口种类取渲染器 */
export const loadDockWindow = async (
  kind: DockWindowKind,
): Promise<ComponentType<DockWindowProps>> => {
  const module = await DOCK_WINDOW_LOADERS[kind]();

  return module.default;
};
