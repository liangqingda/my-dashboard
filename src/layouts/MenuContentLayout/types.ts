/**
 * 菜单内容外壳的 props。
 */

import type { ReactNode } from 'react';

/** 菜单内容页外壳的入参 */
export type MenuContentLayoutProps = {
  /** 页面标题：样式由本组件统一，页面只负责传标题内容 */
  title: ReactNode;
  /** 内容区是否撑满视口高度并禁止外层滚动（滚动交给内部子区域，如英语看板各列） */
  fill?: boolean;
  /** 页面内容 */
  children: ReactNode;
};
