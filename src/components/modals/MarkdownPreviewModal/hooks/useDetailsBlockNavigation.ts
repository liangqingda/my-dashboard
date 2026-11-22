/**
 * 折叠块子预览的状态：现在开着哪一块、正文里的 summary 点击要不要被接管。
 *
 * 弹窗把「点了折叠块标题之后发生什么」收在这一处：
 * - `expand`：什么都不做，交给浏览器在原地展开（等于旧行为）；
 * - `modal`：认出这个 summary 属于第几个折叠块，交给子区域预览弹窗；
 * - **只对原文类折叠块生效**（场景对话原文 / 故事原文）：练习题里的「知识点讲解」「错题讲解」
 *   一律照浏览器默认原地展开，不受这档偏好影响；
 * - 认不出对应折叠块（比如正文与解析结果漂了）时同样退回原地展开，不让点击白按一下。
 *
 * 点在 `<details>` 已经展开的正文上不算点标题：只有 summary 归这里。
 */

import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';

import type { DetailsBlockBehavior, MarkdownDetailBlock } from '../types';
import {
  findDetailBlockIndex,
  getClickedSummary,
} from '../utils/prose-navigation';

/** 折叠块导航的入参 */
export type DetailsBlockNavigationParams = {
  /** 文档里的折叠块，按正文顺序（含不属于原文类、不参与预览的那几块） */
  blocks: readonly MarkdownDetailBlock[];
  /** 当前点击行为 */
  behavior: DetailsBlockBehavior;
  /** 打开子预览之前先收起 header 弹层（两层浮层不该同时开着） */
  beforeOpen: () => void;
};

/** 折叠块导航的状态与动作 */
export type DetailsBlockNavigationState = {
  /** 当前打开第几块；null 表示关着 */
  index: number | null;
  /** 打开 / 切换 / 关闭（`null`） */
  setIndex: (index: number | null) => void;
  /** 收起子预览（换篇、刷新、进编辑、关弹窗时一起清） */
  close: () => void;
  /**
   * 正文点击：折叠块标题被这一层接管时返回 true（调用方据此不再按锚点处理）。
   * `expand` 行为下永远返回 false，让浏览器照常展开。
   */
  handleBodyClick: (event: MouseEvent<HTMLElement>) => boolean;
};

/**
 * 管理折叠块子预览的开合与正文里的 summary 点击。
 *
 * @param params 折叠块列表、当前行为与「开之前先收弹层」
 * @returns 当前下标与一组动作（`DetailsBlockNavigationState`）
 */
export const useDetailsBlockNavigation = ({
  blocks,
  behavior,
  beforeOpen,
}: DetailsBlockNavigationParams): DetailsBlockNavigationState => {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);

  const handleBodyClick = (event: MouseEvent<HTMLElement>): boolean => {
    if (behavior !== 'modal') {
      return false;
    }

    const summary = getClickedSummary(event.target);

    if (!summary) {
      return false;
    }

    const target = findDetailBlockIndex(event.currentTarget, summary);

    // 认不出、或不是原文类（练习题讲解等）时把点击还给浏览器：原地展开总比什么都不发生好
    if (target === null || !blocks[target] || !blocks[target].isOriginal) {
      return false;
    }

    event.preventDefault();
    beforeOpen();
    setIndex(target);

    return true;
  };

  return { close, handleBodyClick, index, setIndex };
};
