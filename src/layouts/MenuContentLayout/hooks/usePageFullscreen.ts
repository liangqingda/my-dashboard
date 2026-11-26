/**
 * 当前菜单页是否全屏：`MenuContentLayout` 持有状态（点按钮、按 `F`、全屏时按 `Esc` 都写回同一份），
 * 这里只负责把它递给页面内部。
 *
 * 页面要跟着全屏改内部形态时读这个 hook，**别自己再读那份 localStorage**：存储只在挂载时读一次，
 * 按按钮改了状态它不会跟着变，页面就会停在按下去之前的形态上。
 * 不在外壳里（`false`）按非全屏对待。
 */

import { createContext, useContext } from 'react';

/** 全屏状态：由 `MenuContentLayout` 下发 */
export const PageFullscreenContext = createContext(false);

/** 读当前菜单页的全屏状态 */
export const usePageFullscreen = (): boolean => useContext(PageFullscreenContext);
