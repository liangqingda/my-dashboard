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
 *
 * 注意：本文件被 `scripts/md-roundtrip.mts` 用 node 的 strip-types 按路径直接加载，
 * 兄弟模块的值导入解析不了扩展名，因此保持自包含——只允许 `import type`。
 */

import type {
  MarkdownBlock,
  MarkdownTableBlock,
  MarkdownTableCell,
  MarkdownTableRow,
} from '../types';

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

/** 生成块内稳定 id（解析与编辑新增共用一套序号，保证一棵树里不重复） */
export const createBlockId = (): string => {
  idSeed += 1;

  return `md-${idSeed}`;
};

/** 解析一个 `<td>` / `<th>` */
const parseCell = (cellMatch: RegExpExecArray): MarkdownTableCell => ({
  attrs: cellMatch[2],
  id: createBlockId(),
  tag: cellMatch[1].toLowerCase() === 'th' ? 'th' : 'td',
  text: decodeEntities(cellMatch[3].replace(/\s+/gu, ' ').trim()),
});

/** 解析一行 `<tr>` */
const parseRow = (rowMatch: RegExpExecArray): MarkdownTableRow => ({
  cells: Array.from(rowMatch[1].matchAll(CELL), parseCell),
  id: createBlockId(),
});

/** 把一段 `<table>…</table>` 解析成表格块；不安全或没有行时返回 null */
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
  const rows = Array.from(source.matchAll(ROW), parseRow);

  if (rows.length === 0) {
    return null;
  }

  return { attrs, colgroup, gapBefore, id: createBlockId(), rows, type: 'table' };
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

  return [`<table${block.attrs}>`, block.colgroup, ...rows, TABLE_CLOSE]
    .filter(Boolean)
    .join('\n');
};

/**
 * 把 Markdown 切成块。空行分块；代码围栏、`<table>`、`<details>` 内部允许跨空行，
 * 因此单独成块。
 */
export const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let buffer: string[] = [];
  let raw: string[] = [];
  let mode: 'details' | 'fence' | 'table' | 'text' = 'text';

  /** 上一个块之后累计的空行数 */
  let blanks = 0;
  /** 当前块之前的空行数，开新块时取一次 */
  let gap = 0;

  /** 追加块：按下标写入，避免每次展开出新数组（O(n²)） */
  const append = (block: MarkdownBlock) => {
    blocks[blocks.length] = block;
  };

  /** 追加源码块（代码围栏 / 表格 / details / 未闭合的残段） */
  const appendRaw = () => {
    append({
      gapBefore: gap,
      id: createBlockId(),
      source: raw.join('\n'),
      type: 'text',
    });
    raw = [];
  };

  const flushText = () => {
    const source = buffer.join('\n').trimEnd();

    if (source) {
      append({ gapBefore: gap, id: createBlockId(), source, type: 'text' });
    }

    buffer = [];
  };

  /** 跨空行的块开始：先收掉手上的文本，重置空行计数 */
  const startRaw = (line: string) => {
    flushText();
    gap = blanks;
    blanks = 0;
    raw = [line];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (mode === 'fence') {
      raw[raw.length] = line;

      if (FENCE.test(trimmed)) {
        appendRaw();
        mode = 'text';
      }

      continue;
    }

    if (mode === 'table') {
      raw[raw.length] = line;

      if (line.includes(TABLE_CLOSE)) {
        const source = raw.join('\n');
        const table = parseTableBlock(source, gap);

        append(
          table ?? { gapBefore: gap, id: createBlockId(), source, type: 'text' },
        );
        raw = [];
        mode = 'text';
      }

      continue;
    }

    if (mode === 'details') {
      raw[raw.length] = line;

      if (line.includes(DETAILS_CLOSE)) {
        appendRaw();
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
      startRaw(line);
      mode = 'fence';

      continue;
    }

    if (TABLE_OPEN.test(trimmed)) {
      startRaw(line);
      mode = 'table';

      continue;
    }

    if (DETAILS_OPEN.test(trimmed)) {
      startRaw(line);
      mode = 'details';

      continue;
    }

    if (buffer.length === 0) {
      gap = blanks;
      blanks = 0;
    }

    buffer[buffer.length] = line;
  }

  flushText();

  if (raw.length > 0) {
    // 表格 / details / 代码围栏没写闭合标签时，整段按源码保留，绝不丢内容
    appendRaw();
  }

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
          : block.source.trimEnd(),
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

/** 编辑态写回：拼回 Markdown，并按原文件的换行风格输出 */
export const blocksToMarkdown = (
  blocks: MarkdownBlock[],
  usesCrlf: boolean,
): string => {
  const text = serializeMarkdownBlocks(blocks);

  return usesCrlf ? text.replace(/\n/gu, '\r\n') : text;
};
