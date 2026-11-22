/**
 * 正文里的两类交互：同文档锚点与折叠块。
 *
 * 它们共用同一件「点一下之后会发生什么」的叙事，也共用同一套让位规则，所以在弹窗这一层
 * 收成一个 hook：正文里点了什么 → 是折叠块标题还是锚点链接 → 按各自记住的偏好
 * 决定「原地处理」还是「开子区域预览」。弹窗只拿结果，不再自己串这三个 hook。
 *
 * 两份内容的口径不一样，别顺手合并：
 * - 锚点区块按**未筛选**正文算：链接里带着 id，筛选裁掉目录行也仍找得回那一节；
 * - 折叠块按**屏上真正渲染的**正文算：它是靠「DOM 里第几个 `<details>`」回查的，
 *   拿未筛选原文去数，筛选裁掉几块之后顺序就会错位。
 *
 * 两层子预览同一时刻只会开一层：打开锚点区块之前先收起折叠块。
 */

import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { MarkdownAnchorBlock, MarkdownDetailBlock } from '../types';
import type { MarkdownPreviewFilter } from '../types/filter';
import { collectAnchorBlocks } from '../utils/anchor-blocks';
import { collectDetailBlocks } from '../utils/details-blocks';

import { useAnchorBlockNavigation } from './useAnchorBlockNavigation';
import type { AnchorBlockNavigationState } from './useAnchorBlockNavigation';
import type { AnchorLinkBehaviorState } from './useAnchorLinkBehavior';
import { useAnchorLinkBehavior } from './useAnchorLinkBehavior';
import type { AnchorNavScopeState } from './useAnchorNavScope';
import { useAnchorNavScope } from './useAnchorNavScope';
import type { DetailsBlockBehaviorState } from './useDetailsBlockBehavior';
import { useDetailsBlockBehavior } from './useDetailsBlockBehavior';
import type { DetailsBlockNavigationState } from './useDetailsBlockNavigation';
import { useDetailsBlockNavigation } from './useDetailsBlockNavigation';
import type { DetailsNavScopeState } from './useDetailsNavScope';
import { useDetailsNavScope } from './useDetailsNavScope';

/** 正文交互的入参 */
export type DocumentInteractionsParams = {
  /** 正文区当前渲染的原文（预览草稿时是草稿） */
  markdown: string;
  /** 预览态的筛选槽；编辑态不筛 */
  filter?: MarkdownPreviewFilter;
  /** 筛选这一刻管不管用：编辑态（含草稿预览）为 false，与工作区同一口径 */
  filtering: boolean;
  /** 开子区域预览之前先收起 header 弹层（两层浮层不该同时开着） */
  beforeOpen: () => void;
  /** 这四份阅读偏好的命名空间：由主预览给（子预览不读它们） */
  storageKey: string;
};

/** 正文交互的状态与动作 */
export type DocumentInteractionsState = {
  /** 同文档锚点指向的区块（未筛选正文） */
  anchorBlocks: MarkdownAnchorBlock[];
  /** 折叠块里那几段内容（屏上渲染的正文） */
  detailBlocks: MarkdownDetailBlock[];
  /** 同文档锚点的两份跨篇偏好 */
  anchorLink: AnchorLinkBehaviorState;
  anchorScope: AnchorNavScopeState;
  /** 折叠块的两份跨篇偏好：点了之后的行为、子预览的切换口径 */
  detailsBlock: DetailsBlockBehaviorState;
  detailsScope: DetailsNavScopeState;
  /** 锚点区块子预览 */
  anchorBlock: AnchorBlockNavigationState;
  /** 折叠块子预览 */
  detailBlock: DetailsBlockNavigationState;
  /** 正文点击：先折叠块、再同文档锚点，路由只在这一处 */
  handleBodyClick: (event: MouseEvent<HTMLElement>) => void;
  /** 收起两层子预览（换篇、刷新、进编辑、关弹窗时一起清） */
  close: () => void;
  /** 有没有子预览开着：Esc / 焦点 / 快捷键都按它让位 */
  subPreviewOpen: boolean;
};

/**
 * 管理正文里的链接与折叠块交互。
 *
 * @param params 正文、筛选槽与「开子预览前先收弹层」
 * @returns 两类内容、两份偏好与两层子预览的状态（`DocumentInteractionsState`）
 */
export const useDocumentInteractions = ({
  beforeOpen,
  filter,
  filtering,
  markdown,
  storageKey,
}: DocumentInteractionsParams): DocumentInteractionsState => {
  const anchorBlocks = useMemo(() => collectAnchorBlocks(markdown), [markdown]);

  /** 屏上真正渲染的正文：与工作区同一个 `filter.apply`、同一份判断 */
  const visibleMarkdown = useMemo(
    () => (filter && filtering ? filter.apply(markdown) : markdown),
    [filter, filtering, markdown],
  );

  const detailBlocks = useMemo(
    () => collectDetailBlocks(visibleMarkdown),
    [visibleMarkdown],
  );

  /** 同文档锚点的点击行为：跨篇记住的阅读偏好 */
  const anchorLink = useAnchorLinkBehavior(storageKey);
  /** 子区域预览的前后切换口径：同样是跨篇记住的阅读偏好 */
  const anchorScope = useAnchorNavScope(storageKey);
  /** 折叠块里那段内容的点击行为：同样是跨篇记住的阅读偏好 */
  const detailsBlock = useDetailsBlockBehavior(storageKey);
  /** 折叠块子预览的前后切换口径：同上，跨篇记住 */
  const detailsScope = useDetailsNavScope(storageKey);

  /**
   * 折叠块子预览的开合与正文 summary 点击：它开在主预览上面，
   * 点标题时按当前行为决定「原地展开」还是「弹窗读这一段」。
   */
  const detailBlock = useDetailsBlockNavigation({
    beforeOpen,
    behavior: detailsBlock.behavior,
    blocks: detailBlocks,
  });
  /**
   * 锚点区块子预览的开合与正文链接点击：点锚点时按当前行为决定「跳过去」还是
   * 「弹窗打开那一节」。开之前顺带收掉折叠块子预览——两层不该同时开着。
   */
  const anchorBlock = useAnchorBlockNavigation({
    beforeOpen: () => {
      beforeOpen();
      detailBlock.close();
    },
    behavior: anchorLink.behavior,
    blocks: anchorBlocks,
  });

  const handleBodyClick = (event: MouseEvent<HTMLElement>) => {
    if (detailBlock.handleBodyClick(event)) {
      anchorBlock.close();

      return;
    }

    anchorBlock.handleBodyClick(event);
  };

  const close = () => {
    anchorBlock.close();
    detailBlock.close();
  };

  return {
    anchorBlock,
    anchorBlocks,
    anchorLink,
    anchorScope,
    close,
    detailBlock,
    detailBlocks,
    detailsBlock,
    detailsScope,
    handleBodyClick,
    subPreviewOpen:
      anchorBlock.index !== null || detailBlock.index !== null,
  };
};
