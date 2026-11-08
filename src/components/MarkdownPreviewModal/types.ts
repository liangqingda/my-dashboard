/**
 * Markdown 预览弹窗的类型契约：调用方传什么、编辑器插槽收什么。
 */

import type { ComponentType } from 'react';

import type { MarkdownOutlineHeading, MarkdownOutlineNode } from '@/utils/markdown-outline';

/**
 * 定制编辑器可选实现的能力：按标题目录的下标把自己那一节滚进视野。
 * 编辑态正文不渲染，目录没法靠 `scrollIntoView` 找标题，只能由编辑器自己定位；
 * 不实现时编辑态点目录没有反应（预览态不受影响）。
 */
export type MarkdownEditorHandle = {
  /**
   * 定位到正文里第 index 个 h1–h4（与标题目录的下标一致）。
   *
   * @param index 标题下标，从 0 开始
   * @returns 是否定位到；找不到时返回 false，弹窗不额外提示
   */
  revealHeading: (index: number) => boolean;
};

/** 定制编辑器收到的入参与出口：正文快照 + 草稿回传 */
export type MarkdownEditorProps = {
  /** 进入编辑时的正文快照 */
  markdown: string;
  /** 编辑过程中的草稿；弹窗保存时取最后一次的值 */
  onChange: (markdown: string) => void;
  /**
   * 可选：编辑器把自己的定位能力交上来，供编辑态的标题目录调用。
   * 每次块变动（内容改了、标题位置变了）都要重新交一份；卸载时交 null。
   * 不实现则编辑态点目录没有反应，预览态不受影响。
   */
  onHandleReady?: (handle: MarkdownEditorHandle | null) => void;
};

/** 预览弹窗的对外 props */
export type MarkdownPreviewModalProps = {
  /** 是否打开预览 */
  opened: boolean;
  /** 标题，通常是文件名 */
  title: string;
  /** Markdown 原文 */
  markdown: string;
  /** 当前位置，如第 3 / 12 篇 */
  position?: { index: number; total: number };
  /** 关闭预览 */
  onClose: () => void;
  /** 上一篇；null 表示没有相邻文档 */
  onPrevious?: (() => void) | null;
  /** 下一篇；null 表示没有相邻文档 */
  onNext?: (() => void) | null;
  /**
   * header 刷新：调用方重新取一次最新正文并回灌 markdown。
   * 返回 Promise 时按钮显示 loading 直到结束；不提供则不显示刷新按钮。
   */
  onRefresh?: (() => Promise<void> | void) | null;
  /** 保存编辑后的 Markdown；提供后 header 才会出现「编辑」图标按钮 */
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
  /**
   * 这一类 Markdown 的定制编辑器。不传则点「编辑」只给出定制提示——
   * 通用组件不假设任何文档结构，编辑逻辑归调用方（见 personalize-edit-markdown）。
   */
  Editor?: ComponentType<MarkdownEditorProps>;
};

/** header 操作组的入参：编辑 / 预览 / 保存 / 放弃改动与状态提示所需的状态 */
export type PreviewHeaderActionsProps = {
  /** 是否处于编辑态 */
  editing: boolean;
  /** 编辑态下是否正在预览草稿（只留「返回编辑」「保存」） */
  previewing: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败的原因 */
  saveError: string | null;
  /** 「已保存」提示的时刻 */
  savedAt: string | null;
  /** 「已保存」后追加的说明 */
  saveNotice: string | null;
  /** 是否在等用户确认放弃改动（退出编辑前） */
  askDiscard: boolean;
  /** 调用方是否提供了编辑能力 */
  canEdit: boolean;
  /** 进入编辑态 */
  onStartEdit: () => void;
  /** 退出编辑态（不写回）；有未保存改动时弹窗先转入确认，不会直接丢草稿 */
  onCancelEdit: () => void;
  /** 编辑态下预览草稿的渲染效果 */
  onStartPreview: () => void;
  /** 草稿预览态下返回编辑器 */
  onStopPreview: () => void;
  /** 保存草稿 */
  onSaveEdit: () => void;
  /** 确认放弃改动并退出编辑 */
  onDiscard: () => void;
  /** 取消放弃，继续编辑 */
  onKeepEditing: () => void;
};

/** 标题目录 sidebar 的入参 */
export type OutlineNavProps = {
  /** 文档内标题列表 */
  headings: MarkdownOutlineHeading[];
  /** 当前小节是第几条标题（-1 表示还判不出）；用来高亮并展开所在分支 */
  activeIndex: number;
  /** 编辑态下置灰不可点 */
  disabled: boolean;
  /** 全屏预览：目录默认全部展开、列宽放宽（小的弹窗里默认只展开前两层） */
  fullscreen: boolean;
  /** 点击第几条标题 */
  onSelect: (index: number) => void;
};

/** 标题导航某一层的入参：渲染这一层的节点，展开时递归渲染下一层 */
export type OutlineNavListProps = {
  /** 这一层的节点 */
  nodes: MarkdownOutlineNode[];
  /** 当前小节是第几条标题（-1 表示还判不出） */
  activeIndex: number;
  /** 编辑态下禁用 */
  disabled: boolean;
  /** 已展开的节点 key 集合 */
  expanded: ReadonlySet<string>;
  /** 点击标题跳转；参数是标题在正文里的下标 */
  onSelect: (index: number) => void;
  /** 点标题时顺手展开（只展开，不收起） */
  onExpand: (key: string) => void;
  /** 点右侧图标时展开 / 收起某个节点的子标题 */
  onToggle: (key: string) => void;
  /** 缩进深度，顶层为 1；每深一层多一段缩进和一条左侧引导线 */
  depth?: number;
  /** 顶层那一层额外带滚动样式；嵌套层不传 */
  className?: string;
};

/** 标题导航单条的入参 */
export type OutlineNavItemProps = {
  /** 是否就是当前所在的这一节 */
  active: boolean;
  /** 编辑态下禁用跳转 */
  disabled: boolean;
  /** 有子标题：标题右侧显示折叠图标 */
  hasChildren: boolean;
  /** 子标题当前是否展开 */
  expanded: boolean;
  /** 标题层级 1–4，决定字号 / 字重 / 颜色（缩进由 List 的引导线表示） */
  level: MarkdownOutlineHeading['level'];
  /** 点击这一条时跳转 */
  onSelect: () => void;
  /** 展开 / 收起子标题 */
  onToggle: () => void;
  /** 标题纯文本；被省略号截断时用 tip 展示完整内容 */
  text: string;
};

/** 编辑态状态机的入参 */
export type NoteEditingParams = {
  /** 当前正文；用来判断草稿是否有改动 */
  markdown: string;
  /** 是否提供了定制编辑器 */
  hasEditor: boolean;
  /** 保存落盘，由调用方实现 */
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
};

/** 编辑态状态机暴露的状态与操作 */
export type NoteEditingState = {
  /** 是否处于编辑态 */
  editing: boolean;
  /** 编辑态下是否正在预览草稿；false 时显示编辑器 */
  previewing: boolean;
  /** 草稿与正文不一致 */
  dirty: boolean;
  /** 草稿；null 表示没在编辑 */
  draft: string | null;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败的原因 */
  saveError: string | null;
  /** 「已保存」提示的时刻，如 20:54 */
  savedAt: string | null;
  /** 提示后追加的说明，如自动提交失败原因 */
  saveNotice: string | null;
  /** 退出编辑前是否在等用户确认放弃改动 */
  askDiscard: boolean;
  /** 编辑器回传草稿 */
  setDraft: (markdown: string) => void;
  /** 进入编辑态 */
  startEditing: () => void;
  /** 退出编辑态（不写回） */
  stopEditing: () => void;
  /** 预览草稿的渲染效果（编辑态内，不丢草稿） */
  startPreview: () => void;
  /** 从草稿预览态回到编辑态 */
  stopPreview: () => void;
  /** 保存草稿 */
  save: () => Promise<void>;
  /** 退出编辑入口：有未保存改动时先在 header 里确认 */
  requestExitEditing: () => void;
  /** 确认放弃改动并退出编辑（弹窗仍开着） */
  discardAndExitEditing: () => void;
  /** 取消放弃，继续编辑 */
  keepEditing: () => void;
};

/** 方向键翻篇的入参 */
export type ArrowNavigationParams = {
  /** 是否启用（弹窗打开且不在编辑态） */
  enabled: boolean;
  /** 上一篇 */
  onPrevious?: (() => void) | null;
  /** 下一篇 */
  onNext?: (() => void) | null;
};

/** 滚动定位当前小节的入参 */
export type ActiveHeadingParams = {
  /** 正文区（同时也是滚动容器）的节点；还没挂上时为 null，挂上后 effect 会自动重建监听 */
  container: HTMLElement | null;
  /** 是否启用（弹窗打开且不在编辑态） */
  enabled: boolean;
  /** 文档内标题列表：数量决定扫几个节点，引用变化表示换了一篇文档，需要重判 */
  headings: MarkdownOutlineHeading[];
};
