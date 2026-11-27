/**
 * 程序坞的 React 上下文：页面弹窗、顶栏设置面板、布局外壳都从这里取状态与动作。
 * Provider 挂在 App 上（`App.tsx`），所以切页面、刷新后条目都还在。
 */

import { createContext } from 'react';

import type { DockContextValue } from './types';

export const DockContext = createContext<DockContextValue | null>(null);
