/**
 * 网格列数：按容器宽度与「瓦片宽度 + 列间距」算这一行能放几列，列宽交给 `1fr` 均分。
 *
 * 不直接用 `@mantine/hooks` 的 `useElementSize`：那个把整份 rect 一起进状态，
 * 分组段收起 / 展开时高度每帧都在变，会带着整个网格每帧重渲染；这里只认宽度，
 * 宽度没变就不 setState（高度变化不再触发重排）。
 *
 * 首次挂载时同步量一次宽度：量不到就按固定瓦片宽度折列，等观察器回调再改成均分铺满；
 * 先量一次是为了避免首帧先按固定宽度铺、下一帧再跳成铺满。
 */

import type { RefCallback } from 'react';
import { useCallback, useRef, useState } from 'react';

import { TILE_GRID_GAP } from '../constants';

/** 观察结果：网格根节点宽度，以及按瓦片宽度算出的列数（还没量到时为 null） */
export type UseGridColumnsResult = {
  /** 挂到网格根节点的 ref */
  ref: RefCallback<HTMLDivElement>;
  /** 这一行能放几列；宽度还没量到时为 null，调用方回落按固定瓦片宽度折列 */
  columns: number | null;
};

/**
 * 按瓦片宽度算列数：`(宽 + 间距) / (瓦片宽 + 间距)` 取整，
 * 保证均分后的列宽不窄于设置的瓦片宽度、也不会宽出一个间距。
 */
export const useGridColumns = (tileWidth: number): UseGridColumnsResult => {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback<RefCallback<HTMLDivElement>>((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (node === null) {
      return;
    }

    /* 挂载时先量一次：避免首帧按固定宽度铺、观察器回来后再跳成均分 */
    setWidth(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;

      /* 根容器没有内边距与边框：内容宽就是这一行能用的宽度 */
      const nextWidth = entry.contentRect.width;

      /* 亚像素抖动不写回：宽度没变就不触发整网格重渲染 */
      setWidth((current) => (Math.abs(current - nextWidth) < 1 ? current : nextWidth));
    });

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const columns =
    width > 0
      ? Math.max(
          1,
          Math.floor((width + TILE_GRID_GAP) / (tileWidth + TILE_GRID_GAP)),
        )
      : null;

  return { columns, ref };
};
