/**
 * 页面弹窗 / 文件瓦片 → 程序坞：先留一个虚位，再把整块内容由大到小飞到虚位中心。
 *
 * 飞行块是源元素的原样深拷贝（窗口内容或整张瓦片），所以一路缩小仍然看得出「是它」。
 * 落到虚位中心后克隆淡掉，真正的图标由小到大长出来（见 `dock-bar` 的 receiving 样式）。
 */

import { prefersReducedMotion } from '@/utils/motion-geometry';

import { DOCK_FLY_DURATION, DOCK_FLY_Z_INDEX } from '../constants';

import { findDockItem, waitForFrames } from './dock-motion';

/** 飞行的起点 / 终点几何 */
type FlightGeometry = {
  /** 落点相对起点的位移 */
  dx: number;
  dy: number;
  /** 到虚位时的缩放（按较小的一维等比缩） */
  scale: number;
};

/** 把源元素拷成固定定位的飞行块；矩形由调用方在源还挂在页面上时量好 */
const cloneForFlight = (source: HTMLElement, rect: DOMRect): HTMLElement => {
  const clone = source.cloneNode(true) as HTMLElement;

  for (const node of clone.querySelectorAll('[id]')) {
    node.removeAttribute('id');
  }

  for (const node of clone.querySelectorAll<HTMLElement>('[data-tile-actions]')) {
    node.style.display = 'none';
  }

  clone.removeAttribute('data-dock-surface');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.position = 'fixed';
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.transformOrigin = 'center';
  clone.style.zIndex = String(DOCK_FLY_Z_INDEX);
  clone.style.willChange = 'transform, opacity';
  clone.style.overflow = 'hidden';
  document.body.appendChild(clone);

  return clone;
};

/**
 * 从源元素飞到程序坞虚位的动画；调用方负责把条目标记为 receiving、
 * 动画结束后清掉标记让图标长出。
 */
export const flyWindowToDock = async (
  source: HTMLElement,
  id: string,
): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  // 页面弹窗收起后会立即卸载：先量好矩形、拷出飞行块，再等程序坞条目出现
  const sourceRect = source.getBoundingClientRect();
  const clone = cloneForFlight(source, sourceRect);
  const item = await waitForFrames(() => {
    const candidate = findDockItem(id);
    const opened =
      candidate !== null && candidate.closest('[data-dock-open="true"]') !== null;

    return opened ? candidate : null;
  });

  if (item === null) {
    clone.remove();
    return;
  }

  const targetRect = item.getBoundingClientRect();
  const geometry: FlightGeometry = {
    dx: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
    dy: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2),
    scale: Math.min(
      targetRect.width / sourceRect.width,
      targetRect.height / sourceRect.height,
      1,
    ),
  };
  const midScale = Math.max(geometry.scale * 1.8, 0.16);

  const animation = clone.animate(
    [
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      { offset: 0.08, opacity: 1, transform: 'translate3d(0, -5px, 0) scale(0.97)' },
      {
        offset: 0.62,
        opacity: 1,
        transform: `translate3d(${geometry.dx * 0.86}px, ${geometry.dy * 0.86}px, 0) scale(${midScale})`,
      },
      {
        offset: 0.86,
        opacity: 0.92,
        transform: `translate3d(${geometry.dx}px, ${geometry.dy}px, 0) scale(${geometry.scale})`,
      },
      {
        opacity: 0.55,
        transform: `translate3d(${geometry.dx}px, ${geometry.dy}px, 0) scale(${geometry.scale * 0.25})`,
      },
    ],
    {
      duration: DOCK_FLY_DURATION,
      easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)',
      fill: 'forwards',
    },
  );

  await animation.finished.catch(() => undefined);
  clone.remove();
};
