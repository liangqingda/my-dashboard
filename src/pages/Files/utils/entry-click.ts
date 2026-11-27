/**
 * 列表里一下点击到底是什么意思：打开、加入待拖拽区、还是整段连选。
 *
 * 三条口径（网格与表格共用同一份判定，别在两处各写一套）：
 * - `⌘` + 点击＝**打开**，和直接点是同一件事：文件夹进这一层、图片 / 视频进预览、应用启动。
 *   一边攒批一边想进去看一眼走的就是这个修饰键，不再被当成「再收一条进批次」；
 * - 没有打开动作的条目（pdf / markdown / 压缩包这类）`⌘` 不给额外语义，退回普通点击；
 * - `Shift` + 点击＝从上次点的那一条连选到这一条（`useDragPending.selectRange` 的锚点）；
 * - 待拖拽区已经非空时，普通点击＝加入 / 移出待拖拽区，不再打开。
 *
 * 返回 `open` / `ignore` 的两种情况都**不拦事件**：让瓦片自己那颗 `onClick` 照常打开。
 */

import type { FileCategory, FileEntry, FolderEntry } from '../types';

/** 一下点击的意图 */
export type EntryClickIntent = 'ignore' | 'open' | 'select' | 'range';

/** 修饰键：只要这两个，事件对象本身用不上 */
type ClickModifiers = {
  metaKey: boolean;
  shiftKey: boolean;
};

/** 列表里能参与点选的两类条目 */
type ClickableEntry = FolderEntry | FileEntry;

/** 有「打开」动作的文件分类：网格与表格只给这两类挂预览入口 */
const OPENABLE_FILE_CATEGORIES: readonly FileCategory[] = ['image', 'video'];

/**
 * 这一条点下去有没有打开动作：文件夹恒有；文件只有图片 / 视频有
 * （`DirectoryGrid` 的 `previewHandler` 与 `TableNameCell` 只给这两类挂 `onOpen`）。
 */
export const entryCanOpen = (entry: ClickableEntry): boolean =>
  'category' in entry
    ? OPENABLE_FILE_CATEGORIES.includes(entry.category)
    : true;

/** 判一下这一下点击要做什么 */
export const entryClickIntent = (
  event: ClickModifiers,
  canOpen: boolean,
  pendingActive: boolean,
): EntryClickIntent => {
  if (event.metaKey && canOpen) {
    return 'open';
  }

  if (event.shiftKey) {
    return 'range';
  }

  return pendingActive ? 'select' : 'ignore';
};
