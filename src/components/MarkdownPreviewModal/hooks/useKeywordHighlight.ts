/**
 * 预览正文里高亮筛选关键词的命中片段。
 *
 * 打标是渲染后的 DOM 后处理（见 `utils/highlight`）：不改 Markdown 源，编辑态与
 * 保存拿到的仍是原文。每次先拆掉上一轮的标记再重打，关键词、正文或启停状态变化时
 * 自动复位；容器卸载时标记随 React 树一起销毁，不需要额外清理。
 */

import { useEffect } from 'react';

import { clearKeywordHighlights, highlightKeyword } from '../utils/highlight';

/**
 * 监听正文容器、关键词与正文内容变化，刷新命中高亮。
 *
 * 正文内容也要进依赖：换篇时正文容器节点不重挂，只盯容器会让上一篇的标记残留在
 * 新一篇的 DOM 上。
 *
 * @param container 正文节点；未挂载时为 null
 * @param keyword 当前筛选关键词（原始输入，内部自行 trim）
 * @param content 当前渲染的正文 Markdown（筛选后）
 * @param enabled 是否处于可高亮的预览态（非编辑态、正文已就绪）
 */
export const useKeywordHighlight = (
  container: HTMLElement | null,
  keyword: string,
  content: string,
  enabled: boolean,
): void => {
  useEffect(() => {
    if (!container) {
      return;
    }

    clearKeywordHighlights(container);

    if (!enabled) {
      return;
    }

    const trimmed = keyword.trim();

    if (trimmed === '') {
      return;
    }

    highlightKeyword(container, trimmed);
  }, [container, content, enabled, keyword]);
};
