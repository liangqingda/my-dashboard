/**
 * 列表空白区的「落手即搬进当前这一层」：网格与表格两处形态共用。
 *
 * 两者都必须在容器上无条件吞掉 `dragover`（连同 `dropEffect` 设为 `move`），
 * 否则指针掠过瓦片/行之间的缝隙时浏览器会把光标打回「禁止放置」；
 * 「现在压在空白处」这一点只用来点亮那块虚线热区，所以 `onDropBlank` 没接
 * （比如弹窗模式）时依旧接管 `dragover`，只是不再点亮。
 *
 * 瓦片/行自己有 `drop`，事件冒上来时由 `data-entry-path` 判定跳过，
 * 只有真正压在两块内容之间的空白处才交给 `onDropBlank`。
 */

import { useState } from 'react';
import type { DragEvent } from 'react';

/** 这次事件是不是落在某条内容上（瓦片 / 行都带 `data-entry-path`） */
const overEntry = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[data-entry-path]') !== null;

/** 入参：落手回调，没接就不启用空白热区 */
export const useBlankDrop = (onDropBlank?: () => void) => {
  const [blankOver, setBlankOver] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    const { dataTransfer } = event;

    event.preventDefault();
    dataTransfer.dropEffect = 'move';
    setBlankOver(onDropBlank !== undefined && !overEntry(event.target));
  };

  /** 进出子元素也会触发：只有真离开整块才收掉空白态 */
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    const next = event.relatedTarget;

    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setBlankOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    setBlankOver(false);

    if (onDropBlank === undefined || overEntry(event.target)) {
      return;
    }

    event.preventDefault();
    onDropBlank();
  };

  return {
    /** 现在是不是压在两块内容之间的空白处 */
    blankOver,
    /** 直接展开挂到容器上：没接 `onDropBlank` 时只有 `onDragOver`，其余为 `undefined` */
    handlers: {
      onDragLeave: onDropBlank === undefined ? undefined : handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: onDropBlank === undefined ? undefined : handleDrop,
    },
  };
};
