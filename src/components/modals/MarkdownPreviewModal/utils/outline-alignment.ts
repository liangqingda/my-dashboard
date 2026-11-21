/**
 * 筛选前的目录 ↔ 筛选后正文的标题下标对齐。
 *
 * 目录在筛选时仍按**未筛选**的正文算（`sidebar 要留住整篇的结构`），但滚动定位只能落在
 * 屏上真正渲染出来的标题上，所以要把「全量目录的第几项」翻成「可见正文的第几个标题」。
 * 筛选只删块、不改标题行，按「层级 + 纯文本」贪心配对即可：同名同级的标题在两边
 * 顺序一致，配不上的就是被筛掉的那一节。
 */

import type { MarkdownOutlineHeading } from '@/utils/markdown-outline';

/** 一次对齐的结果，两份表互为反向 */
export type OutlineAlignment = {
  /** 全量目录每一项对应的可见标题下标；-1 表示这一节被筛掉了 */
  indices: number[];
  /** 反过来：可见标题下标 → 全量目录下标；-1 表示对不上（正常不该发生） */
  reverse: number[];
};

/**
 * 把全量目录与可见目录按顺序配对。
 *
 * @param full 未筛选正文的目录
 * @param visible 筛选后正文的目录
 * @returns 两张下标映射表（`OutlineAlignment`）
 */
export const alignOutlines = (
  full: readonly MarkdownOutlineHeading[],
  visible: readonly MarkdownOutlineHeading[],
): OutlineAlignment => {
  const indices: number[] = [];
  let cursor = 0;

  for (const heading of full) {
    const candidate = visible[cursor];
    const matched =
      cursor < visible.length &&
      candidate.level === heading.level &&
      candidate.text === heading.text;

    indices[indices.length] = matched ? cursor : -1;

    if (matched) {
      cursor += 1;
    }
  }

  const reverse = visible.map(() => -1);

  indices.forEach((visibleIndex, fullIndex) => {
    if (visibleIndex >= 0) {
      reverse[visibleIndex] = fullIndex;
    }
  });

  return { indices, reverse };
};
