/**
 * 整页全屏（内容铺满视口，覆盖顶栏与侧栏）的控制入口：
 * 状态由 `BasicLayout` 持有，菜单页外壳 `MenuContentLayout` 的头部按钮消费。
 */

import { createContext, useContext } from 'react';

/** 全屏控制能力 */
export type PageFullscreen = {
  /** 当前是否处于全屏状态 */
  fullscreen: boolean;
  /** 进入全屏；已在全屏时调用无副作用 */
  enterFullscreen: () => void;
};

/** 兜底值：不在 `BasicLayout` 内时视为非全屏，进入动作不做任何事 */
const APPLY_NOTHING = () => undefined;

/** 全屏控制的 React 上下文 */
export const PageFullscreenContext = createContext<PageFullscreen>({
  fullscreen: false,
  enterFullscreen: APPLY_NOTHING,
});

/** 读取全屏控制能力 */
export const usePageFullscreen = (): PageFullscreen =>
  useContext(PageFullscreenContext);
