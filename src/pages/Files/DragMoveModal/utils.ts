import type { DragEvent } from 'react';

import type { DragMoveSession } from '../hooks/use-drag-move/types';

/** 拖拽经过可放置区域都先关掉默认行为，否则浏览器不给 drop */
export const acceptMove = (event: DragEvent<HTMLElement>) => {
  const { dataTransfer } = event;

  event.preventDefault();
  dataTransfer.dropEffect = 'move';
};

/** 指针在父子元素之间移动也会触发 dragleave：只认真离开整块的那一次 */
const isInsideSelf = (event: DragEvent<HTMLElement>): boolean => {
  const next = event.relatedTarget;

  return next instanceof Node && event.currentTarget.contains(next);
};

/** 离开一个放置区时才收掉它的高亮：内部元素之间的移动不算离开 */
export const leaveOutside = (
  event: DragEvent<HTMLElement>,
  reset: () => void,
) => {
  if (!isInsideSelf(event)) {
    reset();
  }
};

/** 弹窗标题：单项报它的名字，多项只报数量（名字太长会把标题挤成一串省略号） */
export const modalTitle = (session: DragMoveSession | null): string => {
  if (session === null) {
    return '';
  }

  return session.entries.length === 1
    ? `移动「${session.entries[0].name}」`
    : `移动 ${session.entries.length} 项`;
};
