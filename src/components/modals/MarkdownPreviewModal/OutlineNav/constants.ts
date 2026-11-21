/**
 * 标题目录 sidebar 的宽度约束：拖拽区间、收起阈值、键盘步长与存储键。
 *
 * 宽度是「怎么看」的偏好，和全屏一样记在 localStorage：换篇、关掉重开、刷新页面后
 * 都还是上次拖出来的样子。编解码见 `hooks/useOutlineWidth`（那里才是读写偏好的地方，
 * 本文件只放数值与键）。
 */

import type { OutlineWidthPreference } from '../types';

/** 真实拖拽时允许的最小展开宽度：比这更窄目录已经读不了，就该收起了 */
export const OUTLINE_MIN_WIDTH = 140;

/** 上限绝对值：屏幕再宽也不让目录吃掉太多正文 */
export const OUTLINE_MAX_WIDTH = 480;

/** 上限比例：目录最多占工作区宽度的这一档，正文永远是主体 */
export const OUTLINE_MAX_RATIO = 0.45;

/** 拖动到比这还窄就认定为收起：这个宽度下标题已经被切得只剩省略号 */
export const OUTLINE_COLLAPSE_WIDTH = 72;

/** 键盘微调（← / →）一次的步长 */
export const OUTLINE_KEYBOARD_STEP = 16;

/** 目录宽度偏好存在 localStorage 的键 */
export const OUTLINE_WIDTH_STORAGE_KEY =
  'my-dashboard:markdown-preview:outline-width';

/** 没写过偏好时的默认：宽度交给各模式的 CSS 默认（常规 184 / 全屏 300） */
export const DEFAULT_OUTLINE_WIDTH_PREFERENCE: OutlineWidthPreference = {
  width: null,
  collapsed: false,
};
