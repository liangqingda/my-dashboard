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
