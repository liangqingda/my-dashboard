/**
 * 程序坞项目的图标：按窗口种类固定，不随调用方变。
 * 条目只存 `kind`，图标在渲染时查这张表，所以持久化里没有 React 节点。
 */

import {
  IconFileText,
  IconNotes,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import type { DockWindowKind } from '../types';

export const DOCK_KIND_ICON: Record<DockWindowKind, typeof IconFileText> = {
  'markdown-preview': IconFileText,
  'record-detail': IconNotes,
  'image-preview': IconPhoto,
  'video-preview': IconVideo,
};
