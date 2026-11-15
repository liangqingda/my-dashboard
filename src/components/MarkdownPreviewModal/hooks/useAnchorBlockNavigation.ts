/**
 * 同文档锚点区块的状态：现在开着哪一块、正文点击要不要被接管。
 *
 * 弹窗把「点了同文档链接之后发生什么」收在这一处：
 * - `jump`：在当前正文里滚到锚点；
 * - `modal`：认出链接指向的那一节，交给子区域预览弹窗；
 * - 认不出区块（锚点没有对应标题）时退回跳转，不让点击白按一下。
 *
 * 外链与相对路径一律放行，交给浏览器——只有 `#` 开头的链接归这里。
 */

import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';

import type { AnchorLinkBehavior, MarkdownAnchorBlock } from '../types';
import { getClickedAnchor, scrollToAnchor } from '../utils/prose-navigation';

/** 区块导航的入参 */
export type AnchorBlockNavigationParams = {
  /** 文档里被链接指向的区块，按正文顺序 */
  blocks: MarkdownAnchorBlock[];
  /** 当前点击行为 */
  behavior: AnchorLinkBehavior;
  /** 打开子预览之前先收起 header 弹层（两层浮层不该同时开着） */
  beforeOpen: () => void;
};

/** 区块导航的状态与动作 */
export type AnchorBlockNavigationState = {
  /** 当前打开第几块；null 表示关着 */
  index: number | null;
  /** 打开 / 切换 / 关闭（`null`） */
  setIndex: (index: number | null) => void;
  /** 收起子预览（换篇、刷新、进编辑、关弹窗时一起清） */
  close: () => void;
  /** 正文点击：同文档链接被这一层接管，其它链接放行 */
  handleBodyClick: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * 管理子区域预览的开合与正文链接点击。
 *
 * @param params 区块列表、当前行为、正文节点与「开之前先收弹层」
 * @returns 当前下标与一组动作（`AnchorBlockNavigationState`）
 */
export const useAnchorBlockNavigation = ({
  blocks,
  behavior,
  beforeOpen,
}: AnchorBlockNavigationParams): AnchorBlockNavigationState => {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);

  const handleBodyClick = (event: MouseEvent<HTMLElement>) => {
    const anchor = getClickedAnchor(event.target);

    if (!anchor) {
      return;
    }

    event.preventDefault();

    if (behavior === 'modal') {
      const target = blocks.findIndex((block) => block.anchor === anchor);

      if (target >= 0) {
        beforeOpen();
        setIndex(target);

        return;
      }
    }

    /*
     * 弹窗模式下没认出区块（锚点没有对应标题）时，退回跳转，不让点击白按一下。
     * 容器就用点击事件上的正文节点：链接挂在它里面，比另存一份 ref 更准
     */
    scrollToAnchor(event.currentTarget, anchor);
  };

  return { close, handleBodyClick, index, setIndex };
};
