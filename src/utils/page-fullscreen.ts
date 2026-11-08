/**
 * 页面全屏状态的读取入口与存储键。
 *
 * 全屏状态本身由 `MenuContentLayout` 持有并写入（点按钮 / 按 Esc 退出都会写回），
 * 但刷新页面时页面 chunk 是懒加载的：等它挂载才读存储，前面那段时间已经先把
 * 顶栏、侧栏和加载占位露出来了，看起来就是「先闪一下非全屏界面」。
 *
 * 所以这里提供一个**不依赖页面 chunk** 的读取入口，供应用级的加载占位
 * （`@/components/PageLoading`）在页面挂载前就按同一条存储判断要不要铺满视口。
 * 键的拼法只在这里定义一次，写入方读同一个函数，避免两处各拼一套。
 */

import { FLAG_CODEC, readStoredString } from './local-storage';

/** 全屏状态的存储键前缀：实际键按路由拼接，各菜单页各记各的全屏开关 */
const PAGE_FULLSCREEN_STORAGE_PREFIX = 'my-dashboard:fullscreen:';

/** 某个路由的全屏状态存储键 */
export const pageFullscreenKey = (pathname: string): string =>
  `${PAGE_FULLSCREEN_STORAGE_PREFIX}${pathname}`;

/** 读取某个路由上次是否处于全屏；没写过或存储不可用时视为非全屏 */
export const readStoredPageFullscreen = (pathname: string): boolean =>
  FLAG_CODEC.decode(readStoredString(pageFullscreenKey(pathname)));
