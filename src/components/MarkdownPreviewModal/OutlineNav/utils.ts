/**
 * 标题导航的树操作：从树里定位某个下标对应节点的 key 路径。
 */

import type { MarkdownOutlineNode } from '@/utils/markdown-outline';

/** 稳定的空路径：找不到时直接返回它，避免每次换新引用 */
const EMPTY_KEY_PATH: string[] = [];

/**
 * 找出第 index 个标题所在节点的 key 路径（从顶层往内，**含自己**）。
 *
 * 深度优先、只走一条分支：命中即回溯返回，未命中的兄弟分支不会留在路径里。
 * 标题树很浅（h1–h4），不必建下标 → 节点的索引表。
 *
 * @param nodes 目录树（顶层节点）
 * @param index 标题在正文里的下标
 * @returns key 路径；找不到时返回空数组
 */
export const findOutlineKeyPath = (
  nodes: MarkdownOutlineNode[],
  index: number,
): string[] => {
  const path: string[] = [];
  let depth = 0;

  /** 命中目标时返回 true，沿调用栈把路径留住 */
  const walk = (level: MarkdownOutlineNode[]): boolean => {
    for (const node of level) {
      path[depth] = node.heading.key;
      depth += 1;

      if (node.index === index) {
        return true;
      }

      if (node.children.length > 0 && walk(node.children)) {
        return true;
      }

      depth -= 1;
    }

    return false;
  };

  if (!walk(nodes)) {
    return EMPTY_KEY_PATH;
  }

  return path.slice(0, depth);
};
