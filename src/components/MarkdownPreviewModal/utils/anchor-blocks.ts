/**
 * 同文档锚点链接 → 它指向的那一节内容。
 *
 * 笔记里的写法是目录一串 `[标题](#锚点)`，锚点定义在标题行内
 * （`## 本轮习题 <a id="…"></a>`，`rehype-raw` 会把它渲染进标题）。
 * 预览弹窗对这种链接有两种行为：在当前正文里跳过去，或者把那一节单独开窗预览；
 * 两种行为都要先知道「这个锚点落在哪一节」——本文件只做这件事。
 *
 * 只按行扫源文本：不碰 DOM，也不认任何文档语义（`<!-- round-index -->` 这类注释一概不看）。
 */

import {
  extractMarkdownOutline,
  stripInlineMarkup,
} from '@/utils/markdown-outline';

import type { MarkdownAnchorBlock } from '../types';

/** 参与分节的标题层级：与标题目录、正文标题选择器一致（h1–h4） */
const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/u;

/** 代码围栏：里面的 `#` 不是标题，里面的链接与锚点定义也不算数 */
const FENCE_PATTERN = /^(?:```|~~~)/u;

/** 锚点定义：`<a id="x"></a>` / `<a name="x"></a>` */
const ANCHOR_TAG_PATTERN =
  /<a\s[^>]*?\b(?:id|name)\s*=\s*["']([^"']+)["'][^>]*>/giu;

/** 同文档链接：Markdown 的 `[文字](#x)` 与 HTML 的 `<a href="#x">` */
const MD_LINK_PATTERN = /\]\(\s*#([^)\s]+)\s*\)/gu;

const HTML_LINK_PATTERN =
  /<a\s[^>]*?\bhref\s*=\s*["']#([^"']+)["'][^>]*>/giu;

/** 一条标题行 */
type HeadingLine = {
  /** 行号，从 0 开始 */
  line: number;
  /** 层级 1–4 */
  level: number;
  /** 标题原文（含行内的锚点标签） */
  text: string;
};

/** 一次扫描的结果 */
type AnchorScan = {
  /** 锚点 id → 定义它的行号 */
  anchorLines: Map<string, number>;
  /** 标题行，按正文顺序 */
  headings: HeadingLine[];
  /** 被同文档链接指向的锚点 id，按第一次被链接到的顺序 */
  targets: Set<string>;
};

/**
 * 扫一遍正文：标题行、锚点定义位置、被链接指向的锚点。
 *
 * 代码围栏整段跳过——里面的注释与示例链接不该参与分节。
 */
const scanAnchors = (lines: string[]): AnchorScan => {
  const headings: HeadingLine[] = [];
  const anchorLines = new Map<string, number>();
  const targets = new Set<string>();
  let inFence = false;

  lines.forEach((line, index) => {
    if (FENCE_PATTERN.test(line.trimStart())) {
      inFence = !inFence;

      return;
    }

    if (inFence) {
      return;
    }

    const heading = HEADING_PATTERN.exec(line);

    if (heading) {
      headings[headings.length] = {
        level: heading[1].length,
        line: index,
        text: heading[2],
      };
    }

    // 同一个 id 只认第一次定义：重复定义时以第一处为准
    for (const tag of line.matchAll(ANCHOR_TAG_PATTERN)) {
      if (!anchorLines.has(tag[1])) {
        anchorLines.set(tag[1], index);
      }
    }

    for (const link of line.matchAll(MD_LINK_PATTERN)) {
      targets.add(link[1]);
    }

    for (const link of line.matchAll(HTML_LINK_PATTERN)) {
      targets.add(link[1]);
    }
  });

  return { anchorLines, headings, targets };
};

/** 锚点落在第几个标题：它前面的最后一个标题（锚点写在标题行里时就是这一行） */
const resolveHeadingIndex = (
  headings: HeadingLine[],
  anchorLine: number,
): number => {
  let resolved = -1;

  for (const [index, heading] of headings.entries()) {
    if (heading.line > anchorLine) {
      break;
    }

    resolved = index;
  }

  return resolved;
};

/** 一节内容的结束行：下一个同级或更高级标题之前，没有就一直到文档结尾 */
const findSectionEnd = (
  headings: HeadingLine[],
  startIndex: number,
  lineCount: number,
): number => {
  const start = headings[startIndex];
  const next = headings
    .slice(startIndex + 1)
    .find((heading) => heading.level <= start.level);

  return next ? next.line : lineCount;
};

/**
 * 收集文档里被同文档链接指向的区块，按正文顺序排。
 *
 * 「区块」指某一节标题下的全部内容：从标题行到下一个同级或更高级标题之前，
 * 所以跳到 h2 拿走的是整个 h2 小节（含它下面的 h3），跳到 h3 只拿 h3 小节。
 *
 * @param markdown Markdown 原文（用未筛选的正文，筛选只影响「读」）
 * @returns 区块列表；同一节被多个链接指向时只留第一条，没有锚点链接时为空数组
 */
export const collectAnchorBlocks = (
  markdown: string,
): MarkdownAnchorBlock[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const { anchorLines, headings, targets } = scanAnchors(lines);
  const blocks: MarkdownAnchorBlock[] = [];

  if (targets.size === 0) {
    return blocks;
  }

  /** 能落到正文里的目标：没有对应锚点定义的链接点了也找不到位置，不认 */
  const located = Array.from(targets).flatMap((anchor) => {
    const line = anchorLines.get(anchor);

    return line === undefined ? [] : [{ anchor, line }];
  });

  /** 从某几行凑出一块：源文本 + 这一块自己的标题目录 */
  const toBlock = (
    anchor: string,
    startLine: number,
    endLine: number,
    heading: HeadingLine | null,
  ): MarkdownAnchorBlock | null => {
    const source = lines.slice(startLine, endLine).join('\n').trimEnd();

    if (!source) {
      return null;
    }

    return {
      anchor,
      headings: extractMarkdownOutline(source),
      level: heading ? heading.level : 0,
      markdown: source,
      startLine,
      title: heading ? stripInlineMarkup(heading.text) : '',
    };
  };

  /** 整篇没有标题时，第一个标题的行号按文档结尾算 */
  const firstHeadingLine = headings.length === 0 ? lines.length : headings[0].line;
  /** 第一个标题之前就被指向的锚点：那一块是文档开头到第一个标题之前 */
  const opening = located.find(({ line }) => line < firstHeadingLine);

  if (opening) {
    const block = toBlock(opening.anchor, 0, firstHeadingLine, null);

    if (block) {
      blocks[blocks.length] = block;
    }
  }

  /** 每个标题只认第一个落在它这一节的锚点：同一节被多个链接指向时看的是同一块内容 */
  const anchorByHeading = new Map<number, string>();

  located.forEach(({ anchor, line }) => {
    const headingIndex = resolveHeadingIndex(headings, line);

    if (headingIndex >= 0 && !anchorByHeading.has(headingIndex)) {
      anchorByHeading.set(headingIndex, anchor);
    }
  });

  headings.forEach((heading, headingIndex) => {
    const anchor = anchorByHeading.get(headingIndex);

    if (!anchor) {
      return;
    }

    const block = toBlock(
      anchor,
      heading.line,
      findSectionEnd(headings, headingIndex, lines.length),
      heading,
    );

    if (block) {
      blocks[blocks.length] = block;
    }
  });

  return blocks;
};
