/**
 * 中间省略的拼法：把文本切成「头 + 省略号 + 尾」，前面几行填满，省略号落在**最后一行的
 * 水平中间**，尾巴接着排到该行右端。
 *
 * 为什么不能按字符数对半分：字符宽度不等，按字数切出来的省略号会飘到随便哪一行的任意位置。
 * 这里全部按实际排版算——先取文本的逐行矩形，二分出「最后一行的水平中点」落在第几个字符，
 * 再二分出尾巴最多还能放多少个字。全程只用 Range 读布局，候选文案临时写进 textContent 量，
 * 算完把最终拼法写回并返回。
 */

const ELLIPSIS = '…';

/** 留 1px 抹平亚像素取整，避免刚好贴合时误判成溢出 */
const SLACK = 1;

type ContentBox = {
  /** 内容盒左边界（扣掉边框与内边距） */
  left: number;
  /** 内容盒宽度（clientWidth 扣掉左右内边距） */
  width: number;
};

type MiddleEllipsisInput = {
  /** 已挂上的文本元素，里面是原文 */
  element: HTMLElement;
  /** 最多保留的行数 */
  lines: number;
  /** 原文 */
  text: string;
};

/** 读内容盒：行内尺寸取 clientWidth，左边界由边框 + 左内边距换算 */
const contentBoxOf = (element: HTMLElement): ContentBox => {
  const style = getComputedStyle(element);
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;

  return {
    left: element.getBoundingClientRect().left + borderLeft + paddingLeft,
    width: element.clientWidth - paddingLeft - paddingRight,
  };
};

/**
 * 文本按当前排版占出的逐行矩形，一行一个。
 * 被 `overflow: hidden` 裁掉的后面的行同样算进来：矩形是布局结果，不受裁切影响。
 */
const lineRectsOf = (element: HTMLElement): DOMRect[] => {
  const range = document.createRange();

  range.selectNodeContents(element);

  return Array.from(range.getClientRects());
};

/** 文本放不下当前盒子：单行按宽度判，多行按行矩形数判 */
const overflows = (element: HTMLElement, lines: number): boolean => {
  if (lines <= 1) {
    return element.scrollWidth > element.clientWidth + SLACK;
  }

  return lineRectsOf(element).length > lines;
};

/* eslint-disable no-param-reassign -- 候选文案必须逐个写回同一节点才量得准，参数就是那块要临时改写的画布 */
/**
 * 算好中间省略的文案并写回元素，返回同一份文案。
 *
 * @param input `element` 为已挂上的文本元素（里面是原文），`text` 为原文，`lines` 为最多保留的行数
 * @returns 实际要显示的文案；放得下时原样返回原文
 */
export const resolveMiddleEllipsis = ({
  element,
  lines,
  text,
}: MiddleEllipsisInput): string => {
  element.textContent = text;

  /** 藏在隐藏视图里时盒子尺寸为 0，量不出结论，按全文渲染，不误截断 */
  if (element.clientWidth === 0 && element.clientHeight === 0) {
    return text;
  }

  if (!overflows(element, lines)) {
    return text;
  }

  const rects = lineRectsOf(element);
  const textNode = element.firstChild;

  if (rects.length === 0 || textNode === null) {
    return text;
  }

  /** 最后一行的矩形：单行取第一行，多行取第 `lines` 行（后面还有行才说明溢出） */
  const lastLine = rects[Math.min(rects.length, lines) - 1];
  const box = contentBoxOf(element);
  const middle = box.left + box.width / 2;

  const range = document.createRange();

  /** 第 `index` 个字符是否落在最后一行的水平中点之前（含中点那一格） */
  const isBeforeMiddle = (index: number): boolean => {
    range.setStart(textNode, index);
    range.setEnd(textNode, index + 1);

    const rect = range.getBoundingClientRect();

    if (rect.top > lastLine.top + SLACK) {
      return false;
    }

    if (rect.top < lastLine.top - SLACK) {
      return true;
    }

    return rect.left + rect.width / 2 <= middle;
  };

  /** 二分：头最多留到「最后一行的水平中点」为止，前面几行自然被整行填满 */
  let headCount = 0;
  let low = 0;
  let high = text.length - 1;

  while (low <= high) {
    const index = Math.floor((low + high) / 2);

    if (isBeforeMiddle(index)) {
      headCount = index + 1;
      low = index + 1;
    } else {
      high = index - 1;
    }
  }

  const head = text.slice(0, headCount);

  /** 二分：尾巴取原文末尾最多还能放下几个字符，放不下就少一个 */
  let tailCount = 0;
  let lowTail = 0;
  let highTail = text.length - headCount;

  while (lowTail <= highTail) {
    const count = Math.floor((lowTail + highTail) / 2);
    const tail = count === 0 ? '' : text.slice(text.length - count);

    element.textContent = `${head}${ELLIPSIS}${tail}`;

    if (overflows(element, lines)) {
      highTail = count - 1;
    } else {
      tailCount = count;
      lowTail = count + 1;
    }
  }

  const tail = tailCount === 0 ? '' : text.slice(text.length - tailCount);
  const display = `${head}${ELLIPSIS}${tail}`;

  element.textContent = display;

  return display;
};

/* eslint-enable no-param-reassign -- 函数结束，恢复默认规则 */
