/**
 * 正文滚动时跟踪「现在读到哪一节」：返回当前小节是第几个标题（按 extractMarkdownOutline 的顺序）。
 *
 * 判据是标题顶边是否越过正文区顶边下方的参考线，取最后一个越过的；
 * 停在最底部时直接取最后一个可见标题，否则末节太短时永远压不到参考线上。
 */

import { useEffect, useState } from 'react';

import { ACTIVE_HEADING_OFFSET, HEADING_SELECTOR } from '../constants';
import type { ActiveHeadingParams } from '../types';

/**
 * 订阅正文滚动，算出当前小节的标题下标。
 *
 * 每帧直接读一遍可见标题的 rect：标题数量是几十级、正文只有一个滚动容器，
 * 滚动时本来就要布局，比维护一份容易过期的位置缓存可靠。
 *
 * @param params 正文区 ref、是否启用、标题列表
 * @returns 当前小节下标；-1 表示还判不出（没有标题或未启用）
 */
export const useActiveHeadingIndex = ({
  containerRef,
  enabled,
  headings,
}: ActiveHeadingParams): number => {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const container = containerRef.current;

    if (!enabled || !container) {
      return undefined;
    }

    let frame = 0;

    const measure = () => {
      const nodes = container.querySelectorAll<HTMLElement>(HEADING_SELECTOR);
      const line =
        container.getBoundingClientRect().top + ACTIVE_HEADING_OFFSET;
      let active = -1;
      let firstVisible = -1;
      let lastVisible = -1;

      nodes.forEach((node, index) => {
        const rect = node.getBoundingClientRect();

        // 折叠块收起时里面的标题不占空间（宽高都是 0），不参与判定
        if (rect.width === 0 && rect.height === 0) {
          return;
        }

        if (firstVisible === -1) {
          firstVisible = index;
        }

        lastVisible = index;

        if (rect.top <= line) {
          active = index;
        }
      });

      const atBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 1;

      if (atBottom && lastVisible !== -1) {
        active = lastVisible;
      }

      // 还没进第一个标题时也算第一节，目录不至于整片没有高亮
      if (active === -1) {
        active = firstVisible;
      }

      setActiveIndex((current) => (current === active ? current : active));
    };

    const schedule = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    container.addEventListener('scroll', schedule, { passive: true });
    // 展开 / 收起折叠块会改正文高度但不会触发滚动，靠冒泡前的 toggle 补一次判定
    container.addEventListener('toggle', schedule, true);
    window.addEventListener('resize', schedule);

    return () => {
      container.removeEventListener('scroll', schedule);
      container.removeEventListener('toggle', schedule, true);
      window.removeEventListener('resize', schedule);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [containerRef, enabled, headings]);

  return activeIndex;
};
