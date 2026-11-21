/**
 * 预览正文的关键词高亮：渲染完成后在 DOM 文本节点里包住命中片段。
 *
 * 只做「读后展示」：不改 Markdown 源，编辑态与保存拿到的仍是原文。打标发生在
 * react-markdown 渲染出的节点上，每次先拆掉上一轮的标记再重打，避免叠层。
 *
 * 边界：
 * - 代码围栏（`pre` / 行内 `code`）里的文本不拆，避免把代码展示搅碎；
 * - 一个被加粗 / 链接等行内标记拆开的词跨多个文本节点时包不住，命中落在哪个节点就标哪个；
 * - 匹配口径与筛选一致：不区分大小写。
 */

/** 高亮标记上的属性：清理时按它定位，不碰页面上别处可能出现的 `mark` */
const HIGHLIGHT_ATTR = 'data-keyword-highlight';

/** 代码相关容器：里面的文本不参与高亮 */
const CODE_SELECTOR = 'pre, code';

/** 转义正则元字符：关键词是用户输入，不能直接拼进 `new RegExp` */
const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/**
 * 拆掉正文里上一轮包好的高亮标记，把文本还回普通文本节点。
 *
 * @param root 正文容器
 */
export const clearKeywordHighlights = (root: HTMLElement): void => {
  root
    .querySelectorAll<HTMLElement>(`mark[${HIGHLIGHT_ATTR}]`)
    .forEach((mark) => {
      const parent = mark.parentNode;

      if (!parent) {
        return;
      }

      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }

      parent.removeChild(mark);
      // 合并被拆散的相邻文本节点，否则下一轮匹配会被碎节点挡住
      parent.normalize();
    });
};

/** 这个文本节点该不该参与高亮：跳过空白、代码容器内与已有标记内的节点 */
const acceptTextNode = (node: Text): boolean => {
  const text = node.textContent;

  if (text.trim() === '') {
    return false;
  }

  const element = node.parentElement;

  if (!element || element.closest(CODE_SELECTOR)) {
    return false;
  }

  return element.closest(`mark[${HIGHLIGHT_ATTR}]`) === null;
};

/**
 * 把单个文本节点里的命中片段拆出来，各包一层高亮标记。
 *
 * @param node 待处理的文本节点
 * @param pattern 关键词正则（已转义、不区分大小写、带全局标志）
 */
const wrapMatchesInNode = (node: Text, pattern: RegExp): void => {
  const text = node.textContent;
  const parent = node.parentElement;

  if (!parent) {
    return;
  }

  const matches: Array<readonly [number, number]> = [];

  for (const match of text.matchAll(pattern)) {
    matches[matches.length] = [match.index, match.index + match[0].length];
  }

  if (matches.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const [start, end] of matches) {
    if (start > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, start)));
    }

    const mark = document.createElement('mark');

    mark.setAttribute(HIGHLIGHT_ATTR, '');
    mark.textContent = text.slice(start, end);
    fragment.append(mark);

    cursor = end;
  }

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }

  parent.replaceChild(fragment, node);
};

/**
 * 在正文容器里高亮所有命中关键词的片段。
 *
 * 调用方负责先 `clearKeywordHighlights`；本函数只打新标。遍历先用 TreeWalker
 * 收齐文本节点快照再改 DOM，避免边遍历边拆节点把 walker 状态搅乱。
 *
 * @param root 正文容器
 * @param keyword 已 trim 的关键词；非空
 * @returns 打出来的高亮标记，按正文顺序排列；没有命中时为空数组
 */
export const highlightKeyword = (
  root: HTMLElement,
  keyword: string,
): HTMLElement[] => {
  const pattern = new RegExp(escapeRegExp(keyword), 'gui');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return acceptTextNode(node as Text)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const targets: Text[] = [];

  let current = walker.nextNode();

  while (current !== null) {
    targets[targets.length] = current as Text;
    current = walker.nextNode();
  }

  for (const node of targets) {
    wrapMatchesInNode(node, pattern);
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(`mark[${HIGHLIGHT_ATTR}]`),
  );
};
