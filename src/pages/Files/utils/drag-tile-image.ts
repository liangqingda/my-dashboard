/**
 * 起拖那一刻把列表里的那一条整个拷一份，供拖拽影像按原样画。
 *
 * 为什么不重画：视频帧、文件名、体积、文件夹图标与版式全在现成的 DOM 里，拷一份既准又省，
 * 也不用再取一次视频头。拷的时机必须是 `dragstart` 那一刻——那时「正在被拖走」的弱化态
 * 还没压上去，拷到的是这一条原本的样子。
 */

import type { DragTileImage } from '../types';

/** 按路径找回列表里那一条的 DOM：网格 / 表格是 `data-entry-path`，待拖拽区那一格是 `data-pending-chip` */
const findSourceOf = (path: string): HTMLElement | null => {
  const escaped = CSS.escape(path);
  const node =
    document.querySelector(`[data-entry-path="${escaped}"]`) ??
    document.querySelector(`[data-pending-chip="${escaped}"]`);

  return node instanceof HTMLElement ? node : null;
};

/** 拷一条：量下尺寸、摘掉会随拖拽变化的那几个类，返回可整段塞进 DOM 的 HTML */
export const captureTileImage = (
  path: string | undefined,
): DragTileImage | null => {
  if (path === undefined) {
    return null;
  }

  const source = findSourceOf(path);

  if (source === null) {
    return null;
  }

  const box = source.getBoundingClientRect();
  const clone = source.cloneNode(true);

  if (!(clone instanceof HTMLElement)) {
    return null;
  }

  clone.className = clone.className
    .split(' ')
    .filter((token) => !token.includes('dragging') && !token.includes('pending'))
    .join(' ');

  return { height: box.height, html: clone.outerHTML, width: box.width };
};
