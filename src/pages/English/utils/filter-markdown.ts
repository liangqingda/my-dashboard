/**
 * 预览正文的筛选（英语笔记专用）：按「范围 + 关键词」把 Markdown 裁成要显示的那部分。
 *
 * 笔记的骨架是标题——`## 基础信息` / `## 讲解` / `## 本轮习题` / `### <题号>. <题型>`，
 * 所以按标题把正文切成块，只保留命中的块和它们的祖先标题：
 * - 只看习题：只留 `###` 题目块，基础信息表、讲解、每轮的复习统计表一并消失；
 * - 只看错题：题目块里 `**判定**` 不是 ✅ 的那些（没写判定的不算错题，不硬塞进来）；
 * - 关键词：块内任意文本（含标题）命中才保留，与上面的范围条件叠加。
 *
 * 只删不改：返回的仍是合法 Markdown；编辑与保存始终用未筛选的原文，不经过这里。
 */

import type { NoteFilterCondition, NoteFilterScope } from '../types';

/** 标题行：1–4 个 # 加空白再加标题文本（与标题目录、块编辑器的口径一致） */
const HEADING_LINE = /^(#{1,4})\s+\S/u;

/** 代码围栏：围栏里的 `#` 不是标题，要跳过 */
const FENCE = /^(?:```|~~~)/u;

/** 判定行：`**判定**：✅ 正确` / `❌ 搭配错（分写正确）` / `⚠️ 部分正确` */
const VERDICT_LINE = /\*\*判定\*\*：\s*(.+)$/u;

/** 题目块的层级：笔记里题号一律是 `### n. 题型` */
const QUESTION_LEVEL = 3;

/** 一个标题块：标题行 + 它下面到下一个标题之间的行 */
type MarkdownChunk = {
  /** 标题层级 1–4；0 表示第一个标题之前的前言 */
  level: number;
  /** 标题行原文；前言为 null */
  heading: string | null;
  /** 标题之后、下一个标题之前的行 */
  lines: string[];
  /** 父块下标；-1 表示顶层 */
  parent: number;
};

/** 块的可搜索 / 可输出原文 */
const chunkText = (chunk: MarkdownChunk): string =>
  (chunk.heading === null ? chunk.lines : [chunk.heading, ...chunk.lines]).join(
    '\n',
  );

/**
 * 把正文按标题切成块。空行不是分隔符——讲解里的列表、表格、折叠块都要跟着自己的标题走。
 * 代码围栏要成对跳过，否则围栏里的注释会被当成标题，把后面的层级全顶偏。
 */
const splitChunks = (markdown: string): MarkdownChunk[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const chunks: MarkdownChunk[] = [];
  /** 可作父级的块下标栈：遇到同级或更高级的标题就弹掉，剩下的最后一个就是父块 */
  const open: number[] = [];

  let heading: string | null = null;
  let level = 0;
  let body: string[] = [];
  let inFence = false;

  /** 收掉当前块：算好父级、入列，父级栈交给下一个标题接着用 */
  const flush = (): void => {
    const chunk: MarkdownChunk = { heading, level, lines: body, parent: -1 };

    if (heading !== null) {
      while (open.length > 0 && chunks[open[open.length - 1]].level >= level) {
        open.length -= 1;
      }

      chunk.parent = open.length > 0 ? open[open.length - 1] : -1;
    }

    chunks[chunks.length] = chunk;

    if (heading !== null) {
      open[open.length] = chunks.length - 1;
    }

    heading = null;
    level = 0;
    body = [];
  };

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (inFence) {
      body[body.length] = line;

      if (FENCE.test(trimmed)) {
        inFence = false;
      }

      continue;
    }

    if (FENCE.test(trimmed)) {
      inFence = true;
      body[body.length] = line;

      continue;
    }

    const matched = HEADING_LINE.exec(line);

    if (matched) {
      flush();
      heading = line.trimEnd();
      level = matched[1].length;

      continue;
    }

    body[body.length] = line;
  }

  flush();

  return chunks;
};

/** 这一块的判定是不是「做错了」：❌ / ⚠️ 都算，没写判定不算 */
const isWrongAnswer = (chunk: MarkdownChunk): boolean => {
  for (const line of chunk.lines) {
    const verdict = VERDICT_LINE.exec(line);

    if (verdict) {
      return !verdict[1].trim().startsWith('✅');
    }
  }

  return false;
};

/** 范围条件：全部一律命中；习题只认题目块；错题再叠一层判定 */
const matchesScope = (chunk: MarkdownChunk, scope: NoteFilterScope): boolean => {
  if (scope === 'all') {
    return true;
  }

  if (chunk.level !== QUESTION_LEVEL) {
    return false;
  }

  return scope === 'exercise' ? true : isWrongAnswer(chunk);
};

/** 关键词条件：空关键词不筛，否则整块文本（含标题）里找 */
const matchesKeyword = (chunk: MarkdownChunk, keyword: string): boolean =>
  keyword === '' || chunkText(chunk).toLowerCase().includes(keyword);

/**
 * 按筛选条件裁正文。
 *
 * @param markdown 笔记原文
 * @param condition 范围 + 关键词
 * @returns 只含命中块与祖先标题的 Markdown；一条都不命中时返回空串
 */
export const filterNoteMarkdown = (
  markdown: string,
  condition: NoteFilterCondition,
): string => {
  const keyword = condition.keyword.trim().toLowerCase();
  const chunks = splitChunks(markdown);
  const hit = chunks.map(
    (chunk) =>
      matchesScope(chunk, condition.scope) && matchesKeyword(chunk, keyword),
  );
  /** 只保留标题行的祖先块：命中题目之外的内容（基础信息、讲解、统计表）一律不出现 */
  const headingOnly = new Set<number>();

  /** 顺着父链往上记一层：祖先只出标题，不出正文 */
  const keepAncestorHeadings = (index: number): void => {
    const { parent } = chunks[index];

    if (parent >= 0) {
      headingOnly.add(parent);
      keepAncestorHeadings(parent);
    }
  };

  hit.forEach((kept, index) => {
    if (kept) {
      keepAncestorHeadings(index);
    }
  });

  const parts = chunks
    .map((chunk, index) => {
      if (hit[index]) {
        return chunkText(chunk);
      }

      return headingOnly.has(index) && chunk.heading !== null
        ? chunk.heading
        : '';
    })
    .filter((part) => part !== '');

  return parts.length > 0 ? `${parts.join('\n\n')}\n` : '';
};
