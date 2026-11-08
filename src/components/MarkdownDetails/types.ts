/**
 * Markdown 折叠块的类型契约：标题、正文与初始展开状态。
 */

import type { ReactNode } from 'react';

/** 折叠块的入参 */
export type MarkdownDetailsProps = {
  /** 正文；直接透传 react-markdown 的 details 子节点时，里面的 `<summary>` 会被自动抽走 */
  children?: ReactNode;
  /** 初始是否展开 */
  defaultOpen?: boolean;
  /** Markdown 里写了 `<details open>` 时，react-markdown 会以此属性透传，作为初始展开状态 */
  open?: boolean;
  /** 标题；不传时从 children 里的 `<summary>` 取 */
  summary?: ReactNode;
};
