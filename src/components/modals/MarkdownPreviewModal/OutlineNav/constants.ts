/**
 * 标题目录 sidebar 的宽度约束：拖拽区间、收起阈值、键盘步长与存储字段名。
 *
 * 宽度是「怎么看」的偏好，和全屏一样记在 localStorage（这一层预览的命名空间对象里）：
 * 换篇、关掉重开、刷新页面后都还是上次拖出来的样子；主预览与两种子预览各记一份。
 * 编解码见 `hooks/useOutlineWidth`（那里才是读写偏好的地方，本文件只放数值与字段名）。
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

/** 目录宽度偏好在偏好对象里的字段名：各层预览各有一个自己的对象 */
export const OUTLINE_WIDTH_FIELD = 'outlineWidth';

/** 没写过偏好时的默认：宽度交给各模式的 CSS 默认（常规 184 / 全屏 300） */
export const DEFAULT_OUTLINE_WIDTH_PREFERENCE: OutlineWidthPreference = {
  width: null,
  collapsed: false,
};
