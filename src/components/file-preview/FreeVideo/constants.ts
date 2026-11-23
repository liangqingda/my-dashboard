/**
 * 播放器的常量：控制栏的自动收起时长、控制栏区域的选择器。
 *
 * 控制栏外层挂着 `data-video-controls`（见 `index.tsx`）；弹窗 header 的自动隐藏拿这个选择器
 * 判断「指针在控制栏上」，避免鼠标划过播放条时把 header 一起唤出来。
 */

/** 播放中指针静止多久收起控制栏（毫秒） */
export const CONTROLS_HIDE_DELAY = 1000;

/** 控制栏区域的选择器：给「不想被这一块触发」的浮层判断用 */
export const CONTROLS_SELECTOR = '[data-video-controls]';
