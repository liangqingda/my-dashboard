/**
 * 菜单内容外壳的 props。
 */

import type { ReactNode } from 'react';

/** 菜单内容页外壳的入参 */
export type MenuContentLayoutProps = {
  /** 页面标题：样式由本组件统一，页面只负责传标题内容 */
  title: ReactNode;
  /** 标题右侧的页面标题行描述（如文件页的「13.78 GB 可用」）；文案由页面拼好，样式与截断由本组件统一 */
  description?: string;
  /** 标题右侧的页面级操作（如服务页的「重启 agent」）；刷新与全屏按钮由本组件内置 */
  actions?: ReactNode;
  /** 内容区是否撑满视口高度并禁止外层滚动（滚动交给内部子区域，如英语看板各列） */
  fill?: boolean;
  /** 内容 */
  children: ReactNode;
  /** `⌘↑` 回到上一级目录；不传则该组合键不动作 */
  onNavigateParent?: () => void;
  /** `S` 开合页面自己的筛选面板；不传则该键不动作 */
  onToggleFilter?: () => void;
  /** `C` 开合页面自己的收藏面板；不传则该键不动作 */
  onToggleFavorites?: () => void;
};
