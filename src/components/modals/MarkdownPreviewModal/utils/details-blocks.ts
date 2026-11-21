/**
 * 折叠块（`<details>`）→ 子区域预览能读的一段内容。
 *
 * 笔记里的写法是
 * ```
 * <details>
 * <summary>场景对话原文 1</summary>
 * …正文…
 * </details>
 * ```
 * 点了 summary 之后有两种行为（`expand` 原地展开 / `modal` 弹窗单独读），
 * 两种都要先知道「这个折叠块里是哪段内容」——本文件只做这件事。
 *
 * 只按行扫源文本：不碰 DOM，也不认任何文档语义，summary 之外的属性一概不看；
 * 代码围栏里的 `<details>` 是示例，不算数；嵌套的折叠块只取最外层，
 * 里层原样留在正文里（在子预览里按浏览器默认行为展开，不再往下开第三层弹窗）。
 */

import {
  extractMarkdownOutline,
  stripInlineMarkup,
} from '@/utils/markdown-outline';

import type { MarkdownDetailBlock } from '../types';

/** 开标签：整行就是一个 `<details>`（允许带属性），行内夹着正文的写法不认 */
const OPEN_TAG_PATTERN = /^<details\b[^>]*>/iu;

/** 闭标签：整行就是 `</details>` */
const CLOSE_TAG_PATTERN = /^<\/details\s*>/iu;

/** summary 行：整行一个 `<summary>标题</summary>`，标题里可以带行内标记 */
const SUMMARY_PATTERN = /^<summary\b[^>]*>(.*)<\/summary\s*>/iu;

/** 代码围栏：里面的 `<details>` 只是例子 */
const FENCE_PATTERN = /^(?:```|~~~)/u;

/**
 * 把 `[startLine, endLine)` 这几行凑成一段折叠块内容。
 *
 * 第一行非空行若是 summary 就当作标题并从正文里去掉（标题已经显示在子预览的 header 上），
 * 正文为空的折叠块（只有一句 summary）没有可读的东西，不成块。
 *
 * @param lines 整篇按行切开的结果
 * @param startLine `<details>` 所在行号
 * @param endLine `</details>` 所在行号
 * @param index 这是第几个折叠块，用来给 `key` 与缺省标题
 * @returns 这一块内容；没有正文时返回 null
 */
const toBlock = (
  lines: string[],
  startLine: number,
  endLine: number,
  index: number,
): MarkdownDetailBlock | null => {
  const firstLine = startLine + 1;
  /** `</details>` 之前第一行非空的行号：summary 只可能在这一行 */
  const contentOffset = lines
    .slice(firstLine, endLine)
    .findIndex((line) => line.trim() !== '');
  const contentLine = contentOffset < 0 ? endLine : firstLine + contentOffset;
  const summary =
    contentLine < endLine
      ? SUMMARY_PATTERN.exec(lines[contentLine].trim())
      : null;
  const title = summary ? stripInlineMarkup(summary[1]) : '';
  const bodyStart = summary ? contentLine + 1 : firstLine;

  // 只去掉开头那几行空行：块里第一条内容若本来就是缩进代码，`trimStart` 会把缩进吃掉
  const markdown = lines
    .slice(bodyStart, endLine)
    .join('\n')
    .replace(/^\n+/u, '')
    .trimEnd();

  if (!markdown) {
    return null;
  }

  return {
    headings: extractMarkdownOutline(markdown),
    key: `details-${index}`,
    markdown,
    // 没有 summary 的折叠块（浏览器默认显示「详细信息」）给个能看懂的说法
    parentTitle: '',
    title: title || `折叠块 ${index + 1}`,
  };
};

/**
 * 收集文档里的折叠块，按它们在正文里出现的顺序。
 *
 * 顺序必须与渲染出来的 `<details>` 一致：正文里点了 summary 之后，
 * 是靠「它是第几个最外层 details」回查这里的下标（见 `utils/prose-navigation`）。
 *
 * @param markdown Markdown 原文（用未筛选的正文，筛选只影响「读」）
 * @returns 折叠块内容；没有、或都没正文时为空数组
 */
export const collectDetailBlocks = (
  markdown: string,
): MarkdownDetailBlock[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const blocks: MarkdownDetailBlock[] = [];
  /** 还没闭合的 `<details>` 层数：1 表示当前这个是最外层的 */
  let depth = 0;
  /** 最外层 `<details>` 的行号；-1 表示没开着 */
  let startLine = -1;
  let inFence = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (FENCE_PATTERN.test(trimmed)) {
      inFence = !inFence;

      return;
    }

    if (inFence) {
      return;
    }

    if (OPEN_TAG_PATTERN.test(trimmed)) {
      depth += 1;

      if (depth === 1) {
        startLine = index;
      }

      return;
    }

    if (!CLOSE_TAG_PATTERN.test(trimmed)) {
      return;
    }

    // 多出来的闭标签（前面没有开标签）不参与分块
    if (depth === 0) {
      return;
    }

    depth -= 1;

    if (depth !== 0 || startLine < 0) {
      return;
    }

    const block = toBlock(lines, startLine, index, blocks.length);

    if (block) {
      blocks[blocks.length] = block;
    }

    startLine = -1;
  });

  return blocks;
};
