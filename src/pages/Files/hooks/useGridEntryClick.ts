import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { entryClickIntent } from '../utils/entry-click';
import type {
  DraggableEntry,
  FileEntry,
  FolderEntry,
} from '../types';

type GridEntry = FolderEntry | FileEntry;

/**
 * 网格瓦片的点击捕获：⌘ 进目录、Shift 连选、待拖拽区非空时普通点击＝加入 / 移除；
 * 瓦片自带的重命名 / 删除按钮在捕获阶段放行，不参与选中语义。
 */
export const useGridEntryClick = (
  byPath: Map<string, GridEntry>,
  pendingActive: boolean,
  selectOrder: DraggableEntry[],
  onSelectRange: (ordered: DraggableEntry[], path: string) => void,
  onTogglePending: (entry: GridEntry, from: DOMRect) => void,
) =>
  useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const { target } = event;

      // 瓦片右上角的重命名 / 删除自带 onClick，带 ⌘ 点它们不该被当成「选中条目」
      /*
       * 用 `Element` 而不是 `HTMLElement`：文件夹 / 文件图标是 SVG，
       * 点图标时目标不是 HTML 元素，按 `HTMLElement` 判会漏掉「点图标选中」这一路。
       */
      if (
        target instanceof Element &&
        target.closest('[data-tile-actions]') !== null
      ) {
        return;
      }

      const tile =
        target instanceof Element ? target.closest('[data-entry-path]') : null;

      if (!(tile instanceof HTMLElement)) {
        return;
      }

      const entry = tile.dataset.entryPath
        ? byPath.get(tile.dataset.entryPath)
        : undefined;

      if (entry === undefined) {
        return;
      }

      /*
       * ⌘ + 文件夹＝进入这一层；Shift＝连选；待拖拽区非空时普通点击＝加入 / 移除。
       * `open` / `ignore` 都不拦事件，让瓦片自己那颗 onClick 照常打开。
       */
      const intent = entryClickIntent(event, !('category' in entry), pendingActive);

      if (intent === 'ignore' || intent === 'open') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (intent === 'range') {
        onSelectRange(selectOrder, entry.path);

        return;
      }

      // 瓦片的屏幕矩形交给页面：加入待拖拽区时用它当飞行动画的起点
      onTogglePending(entry, tile.getBoundingClientRect());
    },
    [byPath, onSelectRange, onTogglePending, pendingActive, selectOrder],
  );
