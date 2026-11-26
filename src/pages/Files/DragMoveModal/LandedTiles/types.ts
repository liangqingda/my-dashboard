/**
 * 本次搬进这个文件夹的条目：按列表里的样子摆出来，点一下放回手卡。
 */

import type { LandedItem } from '../../hooks/use-drag-move/types';

/** 入参 */
export type LandedTilesProps = {
  /** 本次会话搬进当前这一层的条目（`targetDir` 已经是这一层） */
  items: LandedItem[];
  /** 点某一条：把这一条放回手卡（`tile` 是它此刻的 DOM，调用方据此播回流动画） */
  onReturn: (item: LandedItem, tile: HTMLElement) => void;
};
