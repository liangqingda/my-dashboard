/**
 * 正文内的导航：从点击里认出同文档锚点、滚到某个锚点、滚到第几个标题。
 *
 * 主预览与子区域预览共用这一份：两处都要「点链接 → 定位」和「点目录 → 定位」，
 * 各自再写一遍就等于养两个版本的滚动口径。
 */

import { HEADING_SELECTOR } from '../constants';

/**
 * 把链接里的锚点片段还原成人能用的 id。
 *
 * `decodeURIComponent` 遇到坏的百分号编码会抛错，而这里处理的是用户点了一下链接，
 * 不该让一个畸形 href 把整个预览打断——解不开就按原文找。
 */
const decodeAnchor = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * 从一次点击里取出「同文档锚点」的 id。
 *
 * 只认 `href` 以 `#` 开头的链接：外链、相对路径、`mailto:` 一律返回 null，交给浏览器。
 *
 * @param target 事件目标（`event.target`）
 * @returns 锚点 id（不含 `#`）；不是同文档链接、或片段为空时返回 null
 */
export const getClickedAnchor = (target: EventTarget | null): string | null => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const href = target.closest('a')?.getAttribute('href') ?? '';

  if (!href.startsWith('#')) {
    return null;
  }

  return decodeAnchor(href.slice(1)) || null;
};

/**
 * 从一次点击里认出「折叠块的 summary」。
 *
 * 只有点在标题行上才算：`<details>` 已经展开时点正文不该重新开窗，
 * 点在 summary 里那些内联标记（加粗、高亮）上也仍算点到标题——`closest` 会往上找。
 *
 * @param target 事件目标（`event.target`）
 * @returns summary 节点；不是折叠块标题时返回 null
 */
export const getClickedSummary = (
  target: EventTarget | null,
): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const summary = target.closest('summary');

  return summary instanceof HTMLElement ? summary : null;
};

/**
 * 点的这个 summary 是正文里第几个折叠块。
 *
 * 顺序按「最外层的 `<details>`」算，与 `collectDetailBlocks` 扫源文本时的口径一致；
 * 里层的嵌套折叠块不计入，所以下标不会因为它多了一层而错位。
 *
 * @param container 正文节点（`event.currentTarget`）
 * @param summary 点到的 summary
 * @returns 下标（从 0 开始）；找不出对应折叠块时返回 null
 */
export const findDetailBlockIndex = (
  container: HTMLElement | null,
  summary: HTMLElement,
): number | null => {
  const host = summary.closest('details');

  if (!container || !host) {
    return null;
  }

  const hosts = Array.from(container.querySelectorAll('details')).filter(
    (element) => !element.parentElement?.closest('details'),
  );
  const index = hosts.indexOf(host);

  return index >= 0 ? index : null;
};

/**
 * 滚到正文里的某个锚点。
 *
 * @param container 正文节点（它自己就是滚动容器）
 * @param anchor 锚点 id（不含 `#`）
 * @returns 是否找到并滚过去
 */
export const scrollToAnchor = (
  container: HTMLElement | null,
  anchor: string,
): boolean => {
  if (!container || !anchor) {
    return false;
  }

  const target = container.querySelector(`#${CSS.escape(anchor)}`);

  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return true;
};

/**
 * 滚到正文里第 index 个 h1–h4（与标题目录的下标一致）。
 *
 * @param container 正文节点（它自己就是滚动容器）
 * @param index 标题下标，从 0 开始
 * @returns 是否找到并滚过去
 */
export const scrollToHeading = (
  container: HTMLElement | null,
  index: number,
): boolean => {
  if (!container) {
    return false;
  }

  const headings = container.querySelectorAll(HEADING_SELECTOR);

  if (index < 0 || index >= headings.length) {
    return false;
  }

  headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' });

  return true;
};
