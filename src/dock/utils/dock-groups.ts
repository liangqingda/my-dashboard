/**
 * 程序坞条目按窗口种类分组：同类挨在一起，组与组之间留一道分隔。
 *
 * 排序只决定「摆出来和切换的顺序」，条目的 id / 快照不变；
 * Provider 的 `⌘←` / `⌘→` 与 header 计数都读同一份顺序，显示与切换不会各算一套。
 */

import type { DockEntry, DockWindowKind } from '../types';

/** 分组顺序：图片、视频在前，文档 / 子区块与记录在后，工具列表收尾；同一组内按收起时间正序 */
const KIND_ORDER: readonly DockWindowKind[] = [
  'image-preview',
  'video-preview',
  'markdown-preview',
  'markdown-section',
  'record-detail',
  'cli-commands',
];

const kindRank = (kind: DockWindowKind): number => KIND_ORDER.indexOf(kind);

export const sortDockEntriesByKind = (entries: readonly DockEntry[]): DockEntry[] =>
  [...entries].toSorted(
    (left, right) =>
      kindRank(left.kind) - kindRank(right.kind) ||
      left.createdAt - right.createdAt,
  );

/** 摆到界面上的分组：同类连续成一段，组间画分隔 */
export type DockEntryGroup = {
  kind: DockWindowKind;
  entries: DockEntry[];
};

export const groupDockEntries = (entries: readonly DockEntry[]): DockEntryGroup[] =>
  sortDockEntriesByKind(entries).reduce<DockEntryGroup[]>((groups, entry) => {
    const last = groups.at(-1);

    if (last?.kind === entry.kind) {
      return [
        ...groups.slice(0, -1),
        { entries: [...last.entries, entry], kind: last.kind },
      ];
    }

    return [...groups, { entries: [entry], kind: entry.kind }];
  }, []);
