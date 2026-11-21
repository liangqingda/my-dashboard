/**
 * 预览正文里高亮筛选关键词的命中片段，并在命中之间前后导航。
 *
 * 打标是渲染后的 DOM 后处理（见 `utils/highlight`）：不改 Markdown 源，编辑态与
 * 保存拿到的仍是原文。每次先拆掉上一轮的标记再重打，关键词、正文或启停状态变化时
 * 自动复位；容器卸载时标记随 React 树一起销毁，不需要额外清理。
 *
 * 导航只持有命中标记的下标：前后切换循环滚动，当前命中单独打一档样式；标记节点
 * 列表放 ref，不进 state——它只是滚动定位的句柄，变了不需要重渲染。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MarkdownFilterNavigation } from '../types/filter';
import { clearKeywordHighlights, highlightKeyword } from '../utils/highlight';

/**
 * 监听正文容器、关键词与正文内容变化，刷新命中高亮并给出前后导航。
 *
 * 正文内容也要进依赖：换篇时正文容器节点不重挂，只盯容器会让上一篇的标记残留在
 * 新一篇的 DOM 上。
 *
 * @param container 正文节点；未挂载时为 null
 * @param keyword 当前筛选关键词（原始输入，内部自行 trim）
 * @param content 当前渲染的正文 Markdown（筛选后）
 * @param enabled 是否处于可高亮的预览态（非编辑态、正文已就绪）
 * @returns 命中计数与前后切换动作；无命中时 `total` 为 0、`current` 为 -1
 */
export const useKeywordHighlight = (
  container: HTMLElement | null,
  keyword: string,
  content: string,
  enabled: boolean,
): MarkdownFilterNavigation => {
  /** 当前一轮打出来的命中标记，按正文顺序排列 */
  const marksRef = useRef<HTMLElement[]>([]);
  const [current, setCurrent] = useState(-1);
  const [total, setTotal] = useState(0);

  /**
   * 给下标对得上的标记挂当前档样式，其余摘掉。
   * 直接写 DOM：样式句柄不进 state，避免为一档颜色多一轮渲染。
   */
  const paintCurrentMark = useCallback((index: number) => {
    marksRef.current.forEach((mark, markIndex) => {
      if (markIndex === index) {
        mark.setAttribute('data-current', '');
      } else {
        mark.removeAttribute('data-current');
      }
    });
  }, []);

  useEffect(() => {
    if (!container) {
      return;
    }

    clearKeywordHighlights(container);
    marksRef.current = [];

    const trimmed = keyword.trim();

    const marks =
      enabled && trimmed !== '' ? highlightKeyword(container, trimmed) : [];

    marksRef.current = marks;

    // 计数与当前下标回放一帧：DOM 标记先落地，再通知面板刷新（与滚动跟踪同一口径）
    const frame = requestAnimationFrame(() => {
      paintCurrentMark(marks.length > 0 ? 0 : -1);
      setTotal(marks.length);
      setCurrent(marks.length > 0 ? 0 : -1);
    });

    return () => cancelAnimationFrame(frame);
  }, [container, content, enabled, keyword, paintCurrentMark]);

  /**
   * 前后跳一步：按 marks 长度循环归一化下标，把目标标记滚到正文居中。
   * 用函数式更新读最新下标，避免闭包吃到上一轮的 current。
   */
  const goTo = useCallback(
    (step: number) => {
      const marks = marksRef.current;

      if (marks.length === 0) {
        return;
      }

      setCurrent((prev) => {
        const nextIndex = (prev + step + marks.length) % marks.length;

        paintCurrentMark(nextIndex);
        marks[nextIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        return nextIndex;
      });
    },
    [paintCurrentMark],
  );

  return useMemo<MarkdownFilterNavigation>(
    () => ({
      current,
      total,
      next: () => goTo(1),
      prev: () => goTo(-1),
    }),
    [current, total, goTo],
  );
};
