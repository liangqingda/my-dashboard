/**
 * 折叠块子节点拆分：把 react-markdown 透传的 `<summary>` 和正文分开。
 */

import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

/** summary 元素：没有映射它时，react-markdown 造出来的元素 type 就是标签名 */
const isSummaryElement = (
  node: ReactNode,
): node is ReactElement<{ children?: ReactNode }> =>
  isValidElement(node) && node.type === 'summary';

/** details 子节点的拆分结果 */
export type DetailsChildrenParts = {
  /** 原 `<summary>` 里的内容；没有 summary 时为 null */
  summary: ReactNode;
  /** 除 summary 之外的正文节点 */
  body: ReactNode[];
};

/**
 * 把 details 的子节点拆成「summary 内容 + 正文」。
 *
 * 作者没写 summary 时整段都算正文，标题由调用方自己给。
 */
export const splitDetailsChildren = (
  children: ReactNode,
): DetailsChildrenParts => {
  const nodes = Children.toArray(children);
  const summaryIndex = nodes.findIndex(isSummaryElement);
  const summaryNode = summaryIndex === -1 ? null : nodes[summaryIndex];

  if (!isSummaryElement(summaryNode)) {
    return { summary: null, body: nodes };
  }

  return {
    summary: summaryNode.props.children,
    body: [
      ...nodes.slice(0, summaryIndex),
      ...nodes.slice(summaryIndex + 1),
    ],
  };
};
