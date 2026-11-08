/**
 * 侧栏导航的类型与 props。
 */

import type { IconServer } from '@tabler/icons-react';

/** 一条菜单导航项（`check-structure.mjs` 从 index.tsx 读取 `to` 推断页面） */
export type NavItem = {
  /** 稳定标识 */
  key: string;
  /** 菜单文字 */
  label: string;
  /** 路由路径 */
  to: string;
  /** 图标组件 */
  icon: typeof IconServer;
};

/** 侧栏入参 */
export type SidebarProps = {
  /** 点击导航项后收起侧栏 */
  onNavigate: () => void;
};
