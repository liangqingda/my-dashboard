/**
 * 弹窗里「把本次搬进这个文件夹的某一条放回手卡」：取回条目，并起一趟回流动画。
 *
 * 动画要的起点是那格瓦片此刻的矩形，终点是手卡上的一块——两处都在弹窗 DOM 里，
 * 所以测量与状态都收在这里，弹窗只把「点哪一条、哪一格」递进来。
 */

import { useState } from 'react';

import type { ReturnFlyProps } from '../DragMoveModal/ReturnFly/types';

import type { LandedItem } from './use-drag-move/types';

/** 回手卡时落成的那一块：手卡左上往里缩一点，缩成一小枚即收 */
const HAND_TARGET_SIZE = 44;
const HAND_TARGET_INSET = 16;

/** 入参：取回这一条（`useDragMove.restoreLanded`，真的把它搬回原目录，成功返回 true） */
export const useReturnFly = (restore: (item: LandedItem) => Promise<boolean>) => {
  /** 正在播的一趟回手卡；null 表示没有 */
  const [flight, setFlight] = useState<ReturnFlyProps['flight'] | null>(null);

  /**
   * 点一条「搬进这个文件夹的」：先量下它这一格此刻的矩形、拷一份它的样子，
   * 再把它搬回原目录、放回手卡，最后让拷贝缩着飞进手卡。
   *
   * 搬回成功才播动画：搬失败（同名冲突这类）时那一格原样留着，不能先让动画把人骗过去。
   */
  const start = (item: LandedItem, cell: HTMLElement) => {
    const from = cell.getBoundingClientRect();
    const node = cell.cloneNode(true);

    if (!(node instanceof HTMLElement)) {
      return;
    }

    // 拷贝里只留瓦片本体：把盖在上面的「点一下放回」那层摘掉
    node.querySelector('[data-return-hit="true"]')?.remove();

    void restore(item).then((done) => {
      if (!done) {
        return;
      }

      const card = document.querySelector('[data-hand-card="true"]');

      if (!(card instanceof HTMLElement)) {
        return;
      }

      const box = card.getBoundingClientRect();

      setFlight({
        from,
        node,
        to: {
          height: HAND_TARGET_SIZE,
          left: box.left + HAND_TARGET_INSET,
          top: box.top + HAND_TARGET_INSET,
          width: HAND_TARGET_SIZE,
        },
      });
    });
  };

  /** 播完了 */
  const clear = () => setFlight(null);

  return { clear, flight, start };
};
