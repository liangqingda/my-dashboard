/**
 * 预览态内容筛选的契约：筛选槽怎么传条件、面板能拿到什么、关键词命中怎么导航。
 *
 * 弹窗不知道具体文档结构，只负责按钮、弹层与「编辑态不筛、保存不写筛后结果」
 * 这条边界；筛什么、怎么持久化都归调用方。
 */

import type { ReactNode } from 'react';

/** 关键词匹配的前后导航：预览弹窗持有正文里的命中标记，面板输入框挂回车切换 */
export type MarkdownFilterNavigation = {
  /** 当前匹配下标（从 0 开始）；无匹配时为 -1 */
  current: number;
  /** 命中总数 */
  total: number;
  /** 跳到下一个匹配，末尾循环回开头并滚动定位 */
  next: () => void;
  /** 跳到上一个匹配，开头循环回末尾并滚动定位 */
  prev: () => void;
};

/** 筛选面板渲染时能拿到的东西 */
export type MarkdownFilterRenderProps = {
  /** 收起弹层；筛选即时生效，面板一般用不到，留给「应用型」筛选备用 */
  close: () => void;
  /** 关键词匹配导航；无关键词 / 无匹配 / 非预览态时为 null */
  navigation: MarkdownFilterNavigation | null;
};

/**
 * 预览态的内容筛选。
 *
 * 弹窗不知道具体文档的结构，只负责三件事：header 的筛选图标按钮、就近弹出的面板、
 * 以及「编辑态不筛、保存不写筛后结果」这条边界；筛什么、怎么持久化都归调用方。
 */
export type MarkdownPreviewFilter = {
  /** 是否有筛选条件生效：只影响图标高亮与「没有匹配内容」的空结果提示 */
  active: boolean;
  /** 把正文筛成要渲染的 Markdown；返回值只在预览态使用 */
  apply: (markdown: string) => string;
  /**
   * 关键词：预览态在正文里把命中片段包成 `mark` 高亮；不传 / 空串表示不高亮。
   * 匹配口径与 `apply` 一致（不区分大小写），只作用于预览，不写回笔记。
   */
  keyword?: string;
  /** 弹层内容，由调用方给出筛选控件 */
  render: (props: MarkdownFilterRenderProps) => ReactNode;
};
