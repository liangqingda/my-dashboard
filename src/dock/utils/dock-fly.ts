import {
  DOCK_FLY_Z_INDEX,
  DOCK_MINIMIZE_DURATION,
  DOCK_RECEIVE_ATTRIBUTE,
} from '../constants';
import type { DockPlacement } from '../types';

import {
  CLIP_BY_PLACEMENT,
  FULL_CLIP,
  findDockItem,
  prefersReducedMotion,
  transformKeyframe,
  waitForFrames,
} from './dock-motion';

/**
 * 页面弹窗 → 程序坞：克隆一份窗口框体飞进去（原窗口可以立即卸载，动画继续）。
 *
 * 克隆必须放在这里而不是 `dock-motion.ts`：飞入只是「页面弹窗立即关闭」那条路径用的，
 * 程序坞窗口自己收起走 `shrinkWindowToDock`，两者不共用同一份 DOM 生命周期。
 */
export const flyWindowToDock = async (
  source: HTMLElement,
  id: string,
  placement: DockPlacement,
): Promise<void> => {
  if (prefersReducedMotion()) {
    return;
  }

  const sourceRect = source.getBoundingClientRect();
  const item = await waitForFrames(() => findDockItem(id));
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.removeAttribute('data-dock-surface');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.position = 'fixed';
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = String(DOCK_FLY_Z_INDEX);
  clone.style.willChange = 'transform, clip-path';
  clone.style.overflow = 'hidden';
  document.body.appendChild(clone);

  if (item === null) {
    clone.remove();
    return;
  }

  const targetRect = item.getBoundingClientRect();
  const clip = CLIP_BY_PLACEMENT[placement];

  clone.style.transformOrigin = clip.origin;
  item.setAttribute(DOCK_RECEIVE_ATTRIBUTE, 'true');

  const animation = clone.animate(
    [
      {
        clipPath: FULL_CLIP,
        offset: 0,
        opacity: 1,
        transform: transformKeyframe(sourceRect, targetRect, 0, clip.origin),
      },
      {
        clipPath: clip.mid,
        offset: 0.42,
        opacity: 0.96,
        transform: transformKeyframe(sourceRect, targetRect, 0.46, clip.origin),
      },
      {
        clipPath: clip.late,
        offset: 0.72,
        opacity: 0.88,
        transform: transformKeyframe(sourceRect, targetRect, 0.76, clip.origin),
      },
      {
        clipPath: clip.end,
        offset: 1,
        opacity: 0.62,
        transform: transformKeyframe(sourceRect, targetRect, 1, clip.origin),
      },
    ],
    {
      duration: DOCK_MINIMIZE_DURATION,
      easing: 'cubic-bezier(0.5, 0.02, 0.72, 0.38)',
      fill: 'both',
    },
  );

  await animation.finished.catch(() => undefined);
  clone.remove();
  item.removeAttribute(DOCK_RECEIVE_ATTRIBUTE);
};
