/**
 * 列表里一下点击到底是什么意思：打开、加入待拖拽区、还是整段连选。
 *
 * 三条口径（网格与表格共用同一份判定，别在两处各写一套）：
 * - `⌘` + 点击**文件夹**＝进入这一层（与直接点的语义对齐，给一条「批选到一半想进目录」的出路）；
 * - `Shift` + 点击＝从上次点的那一条连选到这一条（`useDragPending.selectRange` 的锚点）；
 * - 待拖拽区已经非空时，普通点击＝加入 / 移出待拖拽区，不再打开。
 *
 * 返回 `open` / `ignore` 的两种情况都**不拦事件**：让瓦片自己那颗 `onClick` 照常打开。
 */

/** 一下点击的意图 */
export type EntryClickIntent = 'ignore' | 'open' | 'select' | 'range';

/** 修饰键：只要这两个，事件对象本身用不上 */
type ClickModifiers = {
  metaKey: boolean;
  shiftKey: boolean;
};

/** 判一下这一下点击要做什么 */
export const entryClickIntent = (
  event: ClickModifiers,
  isFolder: boolean,
  pendingActive: boolean,
): EntryClickIntent => {
  if (event.metaKey && isFolder) {
    return 'open';
  }

  if (event.shiftKey) {
    return 'range';
  }

  return pendingActive ? 'select' : 'ignore';
};
