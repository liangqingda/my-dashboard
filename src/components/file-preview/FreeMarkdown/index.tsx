/**
 * 全站唯一的 Markdown 渲染层：把一段 Markdown 原文渲染成节点。
 *
 * 锁的是**渲染栈**本身——`react-markdown` + gfm（表格 / 任务列表 / 删除线）+ raw（行内 HTML）；
 * 排版、目录、筛选、编辑这些「看完怎么用」都不归它，调用方自己包语义容器与样式。
 *
 * 只吃 `markdown` 一个字符串、并按它 `memo`：内容没变就不重新解析（长文档整篇解析要几十毫秒），
 * 调用方不必再套一层 `useMemo`。
 */

import { memo } from 'react';
import Markdown from 'react-markdown';

import { REHYPE_PLUGINS, REMARK_PLUGINS } from './constants';

/** Markdown 渲染层的入参 */
export type FreeMarkdownProps = {
  /** 要渲染的 Markdown 原文（不在这里做筛选 / 裁剪） */
  markdown: string;
};

const FreeMarkdown = ({ markdown }: FreeMarkdownProps) => (
  <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
    {markdown}
  </Markdown>
);

export default memo(FreeMarkdown);
