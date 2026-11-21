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

import type { AnchorNavScope, MarkdownAnchorBlock } from '../types';

import { listScopePeers } from './scope-peers';

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
  /**
   * 锚点 id → **指向它的第一条链接**所在的上级标题行号（-1 表示在第一个标题之前）。
   * 同一处目录里的链接同值，子区域预览的 `section` 口径就按它分组。
   */
  linkGroups: Map<string, number>;
};

/**
 * 扫一遍正文：标题行、锚点定义位置、被链接指向的锚点。
 *
 * 代码围栏整段跳过——里面的注释与示例链接不该参与分节。
 */
const scanAnchors = (lines: string[]): AnchorScan => {
  const headings: HeadingLine[] = [];
  const anchorLines = new Map<string, number>();
  const linkGroups = new Map<string, number>();
  const targets = new Set<string>();
  let inFence = false;
  /** 当前所在小节的标题行号：链接归到「它上面最近的那个标题」 */
  let sectionLine = -1;

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
      sectionLine = index;
    }

    // 同一个 id 只认第一次定义：重复定义时以第一处为准
    for (const tag of line.matchAll(ANCHOR_TAG_PATTERN)) {
      if (!anchorLines.has(tag[1])) {
        anchorLines.set(tag[1], index);
      }
    }

    for (const link of line.matchAll(MD_LINK_PATTERN)) {
      targets.add(link[1]);

      // 只记第一次：同一处目录通常只列一遍，后面重复出现的链接不改变分组
      if (!linkGroups.has(link[1])) {
        linkGroups.set(link[1], sectionLine);
      }
    }

    for (const link of line.matchAll(HTML_LINK_PATTERN)) {
      targets.add(link[1]);

      if (!linkGroups.has(link[1])) {
        linkGroups.set(link[1], sectionLine);
      }
    }
  });

  return { anchorLines, headings, linkGroups, targets };
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
 * 某一节的上级标题：往上找第一个层级更小的标题（h2 的上级就是它所属的那一个 h1）。
 *
 * 子区域预览把它接在区块标题后面，用来交代「这一节是哪一轮的内容」——
 * 例：`本轮习题 · 2026-11-15 12:05 · 复习`。
 */
const findParentTitle = (headings: HeadingLine[], index: number): string => {
  const { level } = headings[index];
  let cursor = index - 1;

  while (cursor >= 0) {
    const candidate = headings[cursor];

    if (candidate.level < level) {
      return stripInlineMarkup(candidate.text);
    }

    cursor -= 1;
  }

  return '';
};

/**
 * 收集文档里被同文档链接指向的区块。
 *
 * 「区块」指某一节标题下的全部内容：从标题行到下一个同级或更高级标题之前，
 * 所以跳到 h2 拿走的是整个 h2 小节（含它下面的 h3），跳到 h3 只拿 h3 小节。
 *
 * **顺序按链接出现的先后**，不按标题在正文里的位置：笔记的目录区（`<!-- round-index -->`
 * 那一串链接）本来就按「复习轮次倒序 / 分类」排，链接文本就是所指区块的标题原文，前后切换要跟着目录读到的顺序走，
 * 才算「上一个 / 下一个链接指向的区块」。
 *
 * @param markdown Markdown 原文（用未筛选的正文，筛选只影响「读」）
 * @returns 区块列表；同一节被多个链接指向时只留第一条，没有锚点链接时为空数组
 */
export const collectAnchorBlocks = (
  markdown: string,
): MarkdownAnchorBlock[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const { anchorLines, headings, linkGroups, targets } = scanAnchors(lines);
  const blocks: MarkdownAnchorBlock[] = [];

  if (targets.size === 0) {
    return blocks;
  }

  /** 能落到正文里的目标：没有对应锚点定义的链接点了也找不到位置，不认 */
  const located = Array.from(targets).flatMap((anchor) => {
    const line = anchorLines.get(anchor);

    return line === undefined ? [] : [{ anchor, line }];
  });

  /**
   * 从某几行凑出一块：源文本 + 这一块自己的标题目录。
   *
   * 有标题时**不把标题行写进正文**：这一节的标题已经显示在子区域预览的 header 上，
   * 正文再来一遍就是重复；块内目录也因此只列下属标题（h2 之下的 h3…）。
   */
  const toBlock = (
    anchor: string,
    startLine: number,
    endLine: number,
    heading: HeadingLine | null,
    parentTitle: string,
    linkGroup: number,
  ): MarkdownAnchorBlock | null => {
    const bodyStart = heading ? startLine + 1 : startLine;
    // 只去掉开头那几行空行：块里第一条内容若本来就是缩进代码，`trimStart` 会把缩进吃掉、改掉它的意思
    const source = lines
      .slice(bodyStart, endLine)
      .join('\n')
      .replace(/^\n+/u, '')
      .trimEnd();

    if (!source) {
      return null;
    }

    return {
      anchor,
      headings: extractMarkdownOutline(source),
      key: anchor,
      level: heading ? heading.level : 0,
      linkGroup,
      markdown: source,
      parentTitle,
      startLine,
      title: heading ? stripInlineMarkup(heading.text) : '',
    };
  };

  /** 整篇没有标题时，第一个标题的行号按文档结尾算 */
  const firstHeadingLine = headings.length === 0 ? lines.length : headings[0].line;
  /** 已经产出过区块的标题：同一节被多个链接指向时看的是同一块内容 */
  const usedHeadings = new Set<number>();
  /** 第一个标题之前的锚点只认一条：那一段内容只有一份 */
  let openingDone = false;

  for (const { anchor, line } of located) {
    const headingIndex = resolveHeadingIndex(headings, line);

    if (headingIndex < 0) {
      if (!openingDone) {
        openingDone = true;
        const opening = toBlock(
          anchor,
          0,
          firstHeadingLine,
          null,
          '',
          linkGroups.get(anchor) ?? -1,
        );

        if (opening) {
          blocks[blocks.length] = opening;
        }
      }
    } else if (!usedHeadings.has(headingIndex)) {
      usedHeadings.add(headingIndex);

      const heading = headings[headingIndex];
      const block = toBlock(
        anchor,
        heading.line,
        findSectionEnd(headings, headingIndex, lines.length),
        heading,
        findParentTitle(headings, headingIndex),
        linkGroups.get(anchor) ?? -1,
      );

      if (block) {
        blocks[blocks.length] = block;
      }
    }
  }

  return blocks;
};

/**
 * 按切换口径取「这一次能前后切换到的区块」在列表里的下标。
 *
 * - `all`：全文所有链接指向的区块，按链接出现的顺序（默认，等于旧行为）；
 * - `section`：只保留与当前区块**同一处目录**里的那几个链接（`linkGroup` 相同），
 *   例：`## 讲解` 里列了两轮复习的链接，就只在这两块之间切换，计数也只有 2。
 *
 * @param blocks 整篇的区块列表（`collectAnchorBlocks` 的结果）
 * @param anchor 当前区块的锚点 id
 * @param scope 切换口径
 * @returns 可切换区块的下标，按列表原顺序；找不到当前区块时退回整篇
 */
export const listAnchorBlockPeers = (
  blocks: MarkdownAnchorBlock[],
  anchor: string,
  scope: AnchorNavScope,
): number[] => {
  const current = blocks.find((block) => block.anchor === anchor);

  return listScopePeers(
    blocks.map((block) => block.linkGroup),
    current ? current.linkGroup : null,
    scope,
  );
};
