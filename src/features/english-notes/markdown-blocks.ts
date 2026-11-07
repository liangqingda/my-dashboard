/**
 * 学习笔记的块级解析与序列化（英语页专用，不是通用 Markdown 编辑器）。
 *
 * 编辑不再直接改渲染出来的 DOM，而是先把源文本切成块，块内用受控控件编辑，
 * 保存时按块重新拼回 Markdown。这样格式只会按模板重排一次，不会因为 DOM
 * 反向转换而丢结构（缩进、空行、属性都按块原样保留）。
 *
 * 支持两种块：
 * - `table`：HTML 表格（学习笔记的表格本来就是 HTML），解析成行 / 单元格矩阵；
 * - `text`：其余内容（标题、段落、列表、引用、代码块、`<details>`），原样保留源文本。
 */

/** 表格单元格 */
export type MarkdownTableCell = {
  /** 稳定 id，编辑期间不随内容变化，用作 React key */
  id: string;
  /** td / th */
  tag: 'td' | 'th';
  /** 单元格上原有的属性串，一般是空串 */
  attrs: string;
  /** 单元格纯文本（实体已解码） */
  text: string;
};

/** 表格行 */
export type MarkdownTableRow = {
  /** 稳定 id */
  id: string;
  cells: MarkdownTableCell[];
};

/** HTML 表格块 */
export type MarkdownTableBlock = {
  id: string;
  type: 'table';
  /** 与前一块之间保留的空行数，回写时原样还原 */
  gapBefore: number;
  /** `<table` 与 `>` 之间的属性串 */
  attrs: string;
  /** `<colgroup>…</colgroup>` 原文，没有则为空串 */
  colgroup: string;
  rows: MarkdownTableRow[];
};

/** 文本块：除表格之外的 Markdown / HTML 片段 */
export type MarkdownTextBlock = {
  id: string;
  type: 'text';
  /** 与前一块之间保留的空行数，回写时原样还原 */
  gapBefore: number;
  /** 该块的源文本 */
  source: string;
};

/** 一篇笔记被切分后的块 */
export type MarkdownBlock = MarkdownTableBlock | MarkdownTextBlock;

const TABLE_OPEN = /^<table([^>]*)>/iu;
const TABLE_CLOSE = '</table>';
const DETAILS_OPEN = /^<details/iu;
const DETAILS_CLOSE = '</details>';
const FENCE = /^(?:```|~~~)/u;
const COLGROUP = /<colgroup[^>]*>[\s\S]*?<\/colgroup>/iu;
const ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/giu;
const CELL = /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/giu;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** 解析 html 实体 */
const decodeEntities = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|nbsp|#39);/gu, (match) => ENTITIES[match] ?? match);

/** 写回时只需处理会影响 HTML 语义的三个字符 */
const encodeEntities = (text: string): string =>
  text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

/**
 * 表格能不能安全地做成「行 / 单元格矩阵」。
 *
 * 只要出现这些写法，重排一次就会丢信息，统一降级成源码文本块、让用户直接改原文：
 * - 单元格里带标签（`<br>`、`<strong>`、嵌套表格…）：矩阵编辑只认纯文本；
 * - `<thead>` / `<tbody>` / `<tfoot>` / `<caption>`：回写时会把包裹层抹掉；
 * - `<tr>` 带属性：回写只按裸 `<tr>` 重建；
 * - 表格套表格：逐行正则匹配会截断；
 * - `&nbsp;` 或数字实体：解成普通字符就再也回不去了。
 */
const isStructuredTableSafe = (source: string): boolean => {
  if (/<(thead|tbody|tfoot|caption)\b/iu.test(source)) {
    return false;
  }

  if (/<tr\s+[^>]*>/iu.test(source)) {
    return false;
  }

  if (source.match(/<table\b/giu)?.length !== 1) {
    return false;
  }

  if (/&nbsp;|&#/iu.test(source)) {
    return false;
  }

  return !Array.from(source.matchAll(CELL), (cellMatch) =>
    /<[a-z!/]/iu.test(cellMatch[3]),
  ).some(Boolean);
};

let idSeed = 0;

/** 生成块内稳定 id */
const nextId = (): string => {
  idSeed += 1;

  return `md-${idSeed}`;
};

/** 把一段 `<table>…</table>` 解析成表格块；没有行时返回 null */
const parseTableBlock = (
  source: string,
  gapBefore: number,
): MarkdownTableBlock | null => {
  if (!isStructuredTableSafe(source)) {
    return null;
  }

  const [firstLine] = source.split('\n');
  const attrs = TABLE_OPEN.exec(firstLine)?.[1] ?? '';
  const colgroup = COLGROUP.exec(source)?.[0] ?? '';
  const rows = Array.from(source.matchAll(ROW), (rowMatch) => {
    const cells = Array.from(rowMatch[1].matchAll(CELL), (cellMatch) => {
      const tag: 'td' | 'th' = cellMatch[1].toLowerCase() === 'th' ? 'th' : 'td';

      return {
        attrs: cellMatch[2],
        id: nextId(),
        tag,
        text: decodeEntities(cellMatch[3].replace(/\s+/gu, ' ').trim()),
      };
    });

    return { cells, id: nextId() };
  });

  if (rows.length === 0) {
    return null;
  }

  return { attrs, colgroup, gapBefore, id: nextId(), rows, type: 'table' };
};

/** 表格块序列化：属性、colgroup 原样保留，行与单元格按模板重写 */
const serializeTableBlock = (block: MarkdownTableBlock): string => {
  const rows = block.rows.map((row) => {
    const cells = row.cells
      .map(
        (cell) =>
          `<${cell.tag}${cell.attrs}>${encodeEntities(cell.text)}</${cell.tag}>`,
      )
      .join('');

    return `<tr>${cells}</tr>`;
  });

  return [
    `<table${block.attrs}>`,
    block.colgroup,
    ...rows,
    TABLE_CLOSE,
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * 把 Markdown 切成块。空行分块；代码围栏、`<table>`、`<details>` 内部允许跨空行，
 * 因此单独成块。
 */
export const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');

  let blocks: MarkdownBlock[] = [];
  let buffer: string[] = [];
  let raw: string[] = [];
  let mode: 'details' | 'fence' | 'table' | 'text' = 'text';

  /** 上一个块之后累计的空行数 */
  let blanks = 0;
  /** 当前块之前的空行数，开新块时取一次 */
  let gap = 0;

  const flushText = () => {
    const source = buffer.join('\n').trim();

    if (source) {
      blocks = [
        ...blocks,
        { gapBefore: gap, id: nextId(), source, type: 'text' },
      ];
    }

    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (mode === 'fence') {
      raw = [...raw, line];

      if (FENCE.test(trimmed)) {
        blocks = [
          ...blocks,
          { gapBefore: gap, id: nextId(), source: raw.join('\n'), type: 'text' },
        ];
        raw = [];
        mode = 'text';
      }

      continue;
    }

    if (mode === 'table') {
      raw = [...raw, line];

      if (line.includes(TABLE_CLOSE)) {
        const source = raw.join('\n');
        const table = parseTableBlock(source, gap);

        blocks = [
          ...blocks,
          table ?? {
            gapBefore: gap,
            id: nextId(),
            source,
            type: 'text',
          },
        ];
        raw = [];
        mode = 'text';
      }

      continue;
    }

    if (mode === 'details') {
      raw = [...raw, line];

      if (line.includes(DETAILS_CLOSE)) {
        blocks = [
          ...blocks,
          { gapBefore: gap, id: nextId(), source: raw.join('\n'), type: 'text' },
        ];
        raw = [];
        mode = 'text';
      }

      continue;
    }

    if (!trimmed) {
      flushText();
      blanks += 1;

      continue;
    }

    if (FENCE.test(trimmed)) {
      flushText();
      gap = blanks;
      blanks = 0;
      raw = [line];
      mode = 'fence';

      continue;
    }

    if (TABLE_OPEN.test(trimmed)) {
      flushText();
      gap = blanks;
      blanks = 0;
      raw = [line];
      mode = 'table';

      continue;
    }

    if (DETAILS_OPEN.test(trimmed)) {
      flushText();
      gap = blanks;
      blanks = 0;
      raw = [line];
      mode = 'details';

      continue;
    }

    if (buffer.length === 0) {
      gap = blanks;
      blanks = 0;
    }

    buffer = [...buffer, line];
  }

  flushText();

  return blocks;
};

/**
 * 把块重新拼成 Markdown 源文本：块之间的空行按解析时记录的数量原样还原，
 * 结尾补一个换行。
 */
export const serializeMarkdownBlocks = (blocks: MarkdownBlock[]): string => {
  const parts = blocks
    .map((block) => ({
      gapBefore: block.gapBefore,
      text:
        block.type === 'table'
          ? serializeTableBlock(block)
          : block.source.trim(),
    }))
    .filter((part) => part.text.length > 0);

  if (parts.length === 0) {
    return '';
  }

  const body = parts.reduce(
    (acc, part, index) =>
      index === 0
        ? part.text
        : `${acc}${'\n'.repeat(part.gapBefore + 1)}${part.text}`,
    '',
  );

  return `${body}\n`;
};
