/**
 * 弹窗里「把本次搬进这个文件夹的某一条放回手卡」：搬回原目录，并起一趟回流动画。
 *
 * 动画要的起点是那格瓦片此刻的矩形，终点是**它落座的那一格**（手卡条目列表的末尾那一条，
 * 不是手卡左上角——回到末尾却在左上角收掉，看起来像飞去了第一位）。两处都在弹窗 DOM 里，
 * 所以测量与状态都收在这里，弹窗只把「点哪一条、哪一格」递进来。
 */

import { useState } from 'react';

import type { FlyRect , ReturnFlyProps } from '../DragMoveModal/ReturnFly/types';

import type { LandedItem } from './use-drag-move/types';

/** 找不到那一格时的兜底：落成手卡左上往里缩的一小块 */
const HAND_TARGET_SIZE = 44;
const HAND_TARGET_INSET = 16;

/** 待拖拽区里某一格（按路径找）此刻的矩形；量不到返回 null */
const chipRectOf = (path: string): FlyRect | null => {
  const chip = document.querySelector(`[data-hand-chip="${CSS.escape(path)}"]`);

  if (!(chip instanceof HTMLElement)) {
    return null;
  }

  const box = chip.getBoundingClientRect();

  return { height: box.height, left: box.left, top: box.top, width: box.width };
};

/** 兜底落点：手卡左上那一小块 */
const cardFallbackRect = (): FlyRect | null => {
  const card = document.querySelector('[data-hand-card="true"]');

  if (!(card instanceof HTMLElement)) {
    return null;
  }

  const box = card.getBoundingClientRect();

  return {
    height: HAND_TARGET_SIZE,
    left: box.left + HAND_TARGET_INSET,
    top: box.top + HAND_TARGET_INSET,
    width: HAND_TARGET_SIZE,
  };
};

/** 入参：取回这一条（`useDragMove.restoreLanded`，真的把它搬回原目录，成功返回搬回后的路径） */
export const useReturnFly = (restore: (item: LandedItem) => Promise<string | null>) => {
  /** 正在播的一趟回手卡；null 表示没有 */
  const [flight, setFlight] = useState<ReturnFlyProps['flight'] | null>(null);

  /**
   * 点一条「搬进这个文件夹的」：先量下它这一格此刻的矩形、拷一份它的样子，
   * 再把它搬回原目录、放回手卡，最后让拷贝缩着飞进它新落座的那一格。
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

    void restore(item).then((backPath) => {
      if (backPath === null) {
        return;
      }

      // 新那一格要等 React 把这一帧渲染完才量得到，所以推到下一帧再量
      window.requestAnimationFrame(() => {
        const to = chipRectOf(backPath) ?? cardFallbackRect();

        if (to === null) {
          return;
        }

        setFlight({ from, node, to });
      });
    });
  };

  /** 播完了 */
  const clear = () => setFlight(null);

  return { clear, flight, start };
};
