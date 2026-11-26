/**
 * 弹窗里「把本次搬进这个文件夹的某一条放回手卡」：搬回原目录，并起一趟回流动画。
 *
 * 动画要的起点是那格瓦片此刻的矩形，终点是**它落座的那一格**（手卡条目列表的末尾那一条，
 * 不是手卡左上角——回到末尾却在左上角收掉，看起来像飞去了第一位）。两处都在弹窗 DOM 里，
 * 所以测量与状态都收在这里，弹窗只把「点哪一条、哪一格」递进来。
 */

import { useState } from 'react';

import { cloneFlightBody, dressClone } from '../utils/pending-dom';
import type { FlyRect, ReturnFlyProps } from '../DragMoveModal/ReturnFly/types';

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
  /**
   * 正在播的一趟回手卡；`null` 表示没有。
   * `path` 一拿到就先置位（手卡里那一格立刻变虚位），`flight` 等下一帧量完再补上：
   * 两件事分开，条目才不会在「已经出现」和「动画起步」之间闪一下。
   */
  const [flying, setFlying] = useState<{
    path: string;
    flight: ReturnFlyProps['flight'] | null;
  } | null>(null);

  /**
   * 点一条「搬进这个文件夹的」：先量下它这一格此刻的矩形、拷一份它的样子，
   * 再把它搬回原目录、放回手卡，最后让拷贝缩着飞进它新落座的那一格。
   *
   * 搬回成功才播动画：搬失败（同名冲突这类）时那一格原样留着，不能先让动画把人骗过去。
   */
  const start = (item: LandedItem, cell: HTMLElement) => {
    const from = cell.getBoundingClientRect();
    /*
     * 飞行真身与「列表 → 待拖拽区」那一趟同一套：整格原样深拷贝、尺寸写死，
     * 只把盖在上面的「点一下放回」那层摘掉，别飞一块空白按钮出去。
     */
    const node = cloneFlightBody(cell, from.width, from.height, '');

    node.querySelector('[data-return-hit="true"]')?.remove();

    // 拷贝里的瓦片还带着路径：留着会被「找列表里那一项」扫到，冒充成原条目
    for (const inner of node.querySelectorAll('[data-entry-path]')) {
      inner.removeAttribute('data-entry-path');
    }

    dressClone(node, from.width, from.height);

    void restore(item).then((backPath) => {
      if (backPath === null) {
        return;
      }

      // 先让那一格变虚位（与「条目回手卡」同一次渲染），飞行块下一帧才接手
      setFlying({ flight: null, path: backPath });

      // 新那一格要等 React 把这一帧渲染完才量得到，所以推到下一帧再量
      window.requestAnimationFrame(() => {
        const to = chipRectOf(backPath) ?? cardFallbackRect();

        if (to === null) {
          setFlying(null);

          return;
        }

        setFlying({ flight: { from, node, to }, path: backPath });
      });
    });
  };

  /** 播完了 */
  const clear = () => setFlying(null);

  return {
    clear,
    /** 正在播的那一趟（`null` 时没有） */
    flight: flying === null ? null : flying.flight,
    /** 正飞进来的那一条路径：手卡里它那一格先留虚位，落定后才显形 */
    path: flying === null ? null : flying.path,
    start,
  };
};
