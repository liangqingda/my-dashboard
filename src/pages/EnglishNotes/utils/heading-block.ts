/**
 * 把「正文里第几个标题」翻译成「编辑器里的第几个块」。
 *
 * 编辑态正文不渲染，标题目录没法在 DOM 里找标题，只能回到源文本上数：
 * 目录下标按渲染结果的标题顺序排，这里按源文本里的标题行顺序数，两者一致。
 * 代码围栏里的 `#` 不是标题，必须跳过，否则代码块里的注释会把后面的序号整体顶偏。
 */

import type { MarkdownBlock } from '../types';

/** 围栏行：``` 或 ~~~ 开头（闭合行也匹配，靠它自己成对翻转状态） */
const FENCE = /^(?:```|~~~)/u;

/** Markdown 标题行：1–4 个 # 加至少一个非空字符，与目录口径（h1–h4）一致 */
const HEADING_LINE = /^#{1,4}\s+\S/u;

/**
 * 找出正文里第 headingIndex 个 h1–h4 落在哪个块。
 *
 * @param blocks 当前块列表（按文档顺序）
 * @param headingIndex 标题下标，从 0 开始，与标题目录一致
 * @returns 块下标；没找到返回 -1
 */
export const findBlockIndexForHeading = (
  blocks: MarkdownBlock[],
  headingIndex: number,
): number => {
  if (headingIndex < 0) {
    return -1;
  }

  let seen = 0;

  for (const [blockIndex, block] of blocks.entries()) {
    if (block.type !== 'text') {
      continue;
    }

    let inFence = false;

    for (const line of block.source.split('\n')) {
      if (FENCE.test(line.trimStart())) {
        inFence = !inFence;

        continue;
      }

      if (inFence || !HEADING_LINE.test(line)) {
        continue;
      }

      if (seen === headingIndex) {
        return blockIndex;
      }

      seen += 1;
    }
  }

  return -1;
};
