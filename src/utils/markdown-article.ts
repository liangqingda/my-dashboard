/**
 * 把编辑后的渲染 DOM 序列化回 Markdown 源文本。
 *
 * 只覆盖笔记用到的写法：标题、段落、列表、引用、代码块、`<details>` 折叠块，
 * 以及**原样保留**的 HTML 表格（学习笔记里的表格本来就是 HTML，不能转成管道表格）。
 * 编辑态临时注入的控件（行删除、添加行）不参与序列化。
 */

/** 块与块之间的空行，和学习笔记模板保持一致 */
const BLOCK_GAP = '\n\n';

/** 是否是编辑态注入的临时控件 */
const isInjectedNode = (element: Element): boolean =>
  element.hasAttribute('data-row-action') ||
  element.hasAttribute('data-table-action');

/** 拼接元素内部的 Markdown 行内文本 */
const inlineChildren = (node: Node): string =>
  Array.from(node.childNodes)
    .map((child) => inlineValue(child))
    .join('');

/**
 * 单个节点转成行内 Markdown。
 */
const inlineValue = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement) || isInjectedNode(node)) {
    return '';
  }

  const inner = inlineChildren(node);
  const tag = node.tagName.toLowerCase();

  switch (tag) {
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'code':
      return `\`${node.textContent}\``;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'a':
      return `[${inner}](${node.getAttribute('href') ?? ''})`;
    case 'br':
      return '  \n';
    default:
      return inner;
  }
};

/** 表格属性原样带出，保证样式不被改写 */
const serializeTable = (table: HTMLTableElement): string => {
  const attributes = Array.from(table.attributes)
    .map((attribute) => ` ${attribute.name}="${attribute.value}"`)
    .join('');
  const colgroup = table.querySelector('colgroup')?.outerHTML ?? '';
  const rows = Array.from(table.querySelectorAll('tr')).map((row) => {
    const cells = Array.from(row.children)
      .filter((cell) => !isInjectedNode(cell))
      .map((cell) => {
        const tag = cell.tagName.toLowerCase();

        return `<${tag}>${cell.innerHTML}</${tag}>`;
      })
      .join('');

    return `<tr>${cells}</tr>`;
  });

  return [`<table${attributes}>`, colgroup, ...rows, '</table>']
    .filter(Boolean)
    .join('\n');
};

/** 列表项文本，嵌套列表暂不展开（笔记里没有用到） */
const serializeListItem = (item: Element): string =>
  inlineChildren(item).replace(/\s+/gu, ' ').trim();

/** 引用块：内部按块序列化后统一加前缀 */
const serializeBlockquote = (quote: Element): string =>
  serializeBlocks(quote)
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');

/** `<details>` 折叠块：外层保留 HTML，内部仍按 Markdown 写 */
const serializeDetails = (details: Element): string => {
  const summary = details.querySelector('summary');
  const summaryText = summary ? inlineChildren(summary).trim() : '';
  const body = serializeBlocks(details, summary ?? undefined);

  return [
    '<details>',
    `<summary>${summaryText}</summary>`,
    ...(body ? [BLOCK_GAP.trim(), body] : []),
    '</details>',
  ].join('\n');
};

/** 代码块 */
const serializeCodeBlock = (pre: Element): string => {
  const code = pre.querySelector('code');
  const language = /language-([\w-]+)/u.exec(code?.className ?? '')?.[1] ?? '';

  return `\`\`\`${language}\n${code?.textContent ?? ''}\n\`\`\``;
};

/**
 * 单个块级节点转成 Markdown；返回 `null` 表示跳过。
 */
const serializeBlock = (node: Node): string | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').trim();

    return text || null;
  }

  if (!(node instanceof HTMLElement) || isInjectedNode(node)) {
    return null;
  }

  const tag = node.tagName.toLowerCase();

  if (/^h[1-6]$/u.test(tag)) {
    const level = Number(tag.slice(1));

    return `${'#'.repeat(level)} ${inlineChildren(node).trim()}`;
  }

  switch (tag) {
    case 'p':
      return inlineChildren(node).trim() || null;
    case 'ul':
      return Array.from(node.children)
        .map((item) => `- ${serializeListItem(item)}`)
        .join('\n');
    case 'ol':
      return Array.from(node.children)
        .map((item, index) => `${index + 1}. ${serializeListItem(item)}`)
        .join('\n');
    case 'blockquote':
      return serializeBlockquote(node);
    case 'table':
      return serializeTable(node as HTMLTableElement);
    case 'details':
      return serializeDetails(node);
    case 'pre':
      return serializeCodeBlock(node);
    case 'hr':
      return '---';
    case 'summary':
      return null;
    default:
      return inlineChildren(node).trim() || null;
  }
};

/**
 * 序列化一个容器的全部子节点；`skip` 用于跳过 details 里的 summary。
 */
const serializeBlocks = (container: Node, skip?: Node): string => {
  const blocks = Array.from(container.childNodes)
    .filter((node) => node !== skip)
    .map((node) => serializeBlock(node))
    .filter((block): block is string => block !== null);

  return blocks.join(BLOCK_GAP);
};

/**
 * 序列化整篇文档；保证以换行结尾，和学习笔记的现有格式一致。
 */
export const serializeArticle = (article: HTMLElement): string => {
  const markdown = serializeBlocks(article).trimEnd();

  return markdown ? `${markdown}\n` : '';
};
