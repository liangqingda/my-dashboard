/**
 * 预览列表侧栏的契约：只列「当前目录里有哪些条目、当前在看哪一条」，
 * 切换由 `onSelect` 交回弹窗，不在这里做翻篇边界判断。
 * 视频预览与图片预览共用这一份，条目图标与标题由调用方给。
 */

import type { ReactNode } from 'react';

/** 侧栏里的一条：id 用来高亮与回传，name 用来展示 */
export type PreviewSidebarItem = {
  id: string;
  name: string;
};

/** 侧栏入参 */
export type PreviewSidebarProps = {
  /** 侧栏标题，如「当前目录视频」「当前目录图片」 */
  title: string;
  /** 每条前面的图标（组件不自己按类型选） */
  icon: ReactNode;
  /** 当前目录里的条目（顺序即翻篇顺序） */
  items: readonly PreviewSidebarItem[];
  /** 当前正在预览的条目 id */
  activeId: string;
  /** 点选某一条 */
  onSelect: (id: string) => void;
};
