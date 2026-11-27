/**
 * 程序坞与布局之间的尺寸换算。
 *
 * 程序坞停在哪条边，页面就在对应方向让出一条厚度（header / sidebar 一起让），
 * 让出的量由布局写进 CSS 变量，见 `layouts/BasicLayout/index.scss`。
 */

import { DOCK_BOX_BORDER, DOCK_BOX_PADDING, DOCK_EDGE_GAP } from '../constants';
import type { DockPlacement } from '../types';

/** 程序坞盒子外侧厚度（图标 + 内边距 + 描边） */
export const dockThickness = (itemSize: number) =>
  itemSize + (DOCK_BOX_PADDING + DOCK_BOX_BORDER) * 2;

/** 程序坞占掉的那条边：盒子厚度再加两侧与屏幕边缘的呼吸位 */
export const dockReservedThickness = (itemSize: number) =>
  dockThickness(itemSize) + DOCK_EDGE_GAP * 2;

/** 布局读的四个 CSS 变量（隐藏时全为 0） */
export type DockLayoutVars = Record<
  '--dock-top' | '--dock-right' | '--dock-bottom' | '--dock-left',
  string
>;

/** 按停靠边生成让位变量；没停靠的三条边明确写 0，布局不用再兜底 */
export const dockLayoutVars = (
  placement: DockPlacement,
  reserved: number,
): DockLayoutVars => {
  const value = `${reserved}px`;

  return {
    '--dock-top': placement === 'top' ? value : '0px',
    '--dock-right': placement === 'right' ? value : '0px',
    '--dock-bottom': placement === 'bottom' ? value : '0px',
    '--dock-left': placement === 'left' ? value : '0px',
  };
};
