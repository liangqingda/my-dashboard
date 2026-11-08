/**
 * 从 Markdown 原文里抽取标题目录（h1–h4），用于预览弹窗左上角的标题导航。
 *
 * 通用逻辑：不认识任何具体文档形态，只按「行首 # 标题 + 跳过代码围栏」处理。
 */

/** 标题导航收录的最深层级：笔记里每道题都是 h4，只收到 h3 会漏掉大半 */
const MAX_HEADING_LEVEL = 4;

/** 行首标题：一到四个 # + 空格 + 标题正文 */
const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/u;

/** 用于渲染的标题信息 */
export type MarkdownOutlineHeading = {
  /** 层级：1 / 2 / 3 / 4 */
  level: number;
  /** 纯文本标题 */
  text: string;
  /** 稳定 key：同名标题按出现次序区分 */
  key: string;
};

/** 标题导航树的一个节点：标题本身 + 它的子标题 */
export type MarkdownOutlineNode = {
  /** 这一节的标题 */
  heading: MarkdownOutlineHeading;
  /** 该标题在正文里的下标（按 extractMarkdownOutline 的顺序），用于滚动定位 */
  index: number;
  /** 下一级标题；没有子标题时为空数组 */
  children: MarkdownOutlineNode[];
};

/** 去掉标题里的内联 Markdown 标记，留住可读文本。 */
const stripInlineMarkup = (text: string): string =>
  text
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim();

/**
 * 抽取文档内的 h1–h4，按书写顺序返回。
 * 同名标题用出现次数做 key，避免 React 列表 key 重复；
 * 计数走 Map，单次遍历即可，不会每遇到一个标题就回头扫一遍已收集的结果。
 */
export const extractMarkdownOutline = (
  markdown: string,
): MarkdownOutlineHeading[] => {
  const headings: MarkdownOutlineHeading[] = [];
  /** 同名标题已经出现过几次 */
  const occurrences = new Map<string, number>();
  let inCode = false;

  for (const line of markdown.split('\n')) {
    const trimmed = line.trimStart();

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      continue;
    }

    const match = HEADING_PATTERN.exec(line);

    if (!match) {
      continue;
    }

    const level = match[1].length;

    if (level > MAX_HEADING_LEVEL) {
      continue;
    }

    const text = stripInlineMarkup(match[2]);

    if (!text) {
      continue;
    }

    const occurrence = occurrences.get(text) ?? 0;

    occurrences.set(text, occurrence + 1);
    // 用下标追加而不是 push：避免数组变异写法，同时保持单次遍历
    headings[headings.length] = {
      key: `${level}:${text}:${occurrence}`,
      level,
      text,
    };
  }

  return headings;
};

/**
 * 把扁平标题列表按层级折成树：后出现的更高级别标题挂到最近的、层级更浅的标题下。
 *
 * 用「栈 + 游标」而不是递归/回溯：标题本来就是按文档顺序给出的，一次遍历即可，
 * 同时避免 push / pop 这类数组变异写法（项目 lint 禁）。层级跳级（h2 下面直接 h4）
 * 也自然处理：栈顶会被压到层级更浅的位置为止。
 */
export const buildMarkdownOutlineTree = (
  headings: MarkdownOutlineHeading[],
): MarkdownOutlineNode[] => {
  const roots: MarkdownOutlineNode[] = [];
  /** 当前路径上的节点，depth 以内的位置有效 */
  const path: MarkdownOutlineNode[] = [];
  let depth = 0;

  headings.forEach((heading, index) => {
    while (depth > 0 && path[depth - 1].heading.level >= heading.level) {
      depth -= 1;
    }

    const node: MarkdownOutlineNode = { heading, index, children: [] };

    if (depth === 0) {
      roots[roots.length] = node;
    } else {
      const parent = path[depth - 1];

      parent.children[parent.children.length] = node;
    }

    path[depth] = node;
    depth += 1;
  });

  return roots;
};
