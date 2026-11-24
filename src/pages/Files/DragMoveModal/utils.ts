import type { DragEvent } from 'react';

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
