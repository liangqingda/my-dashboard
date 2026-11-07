/**
 * 从 Markdown 原文里抽取标题目录（h1–h3），用于预览弹窗左上角的标题导航。
 *
 * 通用逻辑：不认识任何具体文档形态，只按「行首 # 标题 + 跳过代码围栏」处理。
 */

/** 标题导航收录的最深层级 */
const MAX_HEADING_LEVEL = 3;

/** 用于渲染的标题信息 */
export type MarkdownOutlineHeading = {
  /** 层级：1 / 2 / 3 */
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
 * 抽取文档内的 h1–h3，作为按书写顺序排列的标题导航。
 * 同名标题用出现次数做 key，避免 React 列表 key 重复。
 */
export const extractMarkdownOutline = (
  markdown: string,
): MarkdownOutlineHeading[] => {
  const { headings } = markdown.split('\n').reduce<{
    headings: MarkdownOutlineHeading[];
    inCode: boolean;
  }>(
    (acc, line) => {
      const trimmed = line.trimStart();

      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        return { headings: acc.headings, inCode: !acc.inCode };
      }

      if (acc.inCode) {
        return acc;
      }

      const match = /^(#{1,3})\s+(.+)$/u.exec(line);

      if (!match) {
        return acc;
      }

      const level = match[1].length;

      if (level > MAX_HEADING_LEVEL) {
        return acc;
      }

      const text = stripInlineMarkup(match[2]);

      if (!text) {
        return acc;
      }

      const occurrence = acc.headings.filter(
        (item) => item.text === text,
      ).length;

      return {
        headings: [
          ...acc.headings,
          { key: `${level}:${text}:${occurrence}`, level, text },
        ],
        inCode: acc.inCode,
      };
    },
    { headings: [], inCode: false },
  );

  return headings;
};
