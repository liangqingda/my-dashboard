/**
 * 英语笔记模块的纯工具函数：分列、排序、文件名展示。
 *
 * 分类键、目标知识点、笔记更新时间都由读盘侧解析好随摘要下发（见 `docs/local-repo-data.md`），
 * 这里不再扫正文，只做展示与排序需要的换算。
 */

import { formatDateTime } from '@/utils/format';

import type {
  NoteCategoryPlan,
  NoteColumn,
  NoteRow,
  NoteSummary,
  NotesSort,
} from '../types';
import { NOTES_DIR } from '../constants';

/**
 * 笔记在 learn-english 仓库里的相对路径，如
 * `learning-record-notes/errors-back-west-spacing.md`。
 *
 * 表格的「操作」列与预览弹窗 header 复制出去的就是这一串：相对于记录仓库根目录，
 * 粘进终端、编辑器或另一个 agent 都能直接定位到文件，不依赖本机绝对路径。
 */
export const getNoteRelativePath = (name: string): string =>
  `${NOTES_DIR}/${name}`;

/**
 * 摘要里的「笔记更新时间」（ISO 串）转时间戳，用于列内排序与展示。
 * 解析不出来返回 0，调用方据此不渲染时间文案。
 */
export const toNoteTimestamp = (updatedAt: string): number => {
  const parsed = Date.parse(updatedAt);

  return Number.isNaN(parsed) ? 0 : parsed;
};

/** 展示用的更新时间文案，如 2026/11/08 14:39；时间未知返回空串（不渲染成 1970 年） */
const formatNoteUpdatedAt = (updatedAt: number): string =>
  updatedAt > 0 ? formatDateTime(updatedAt) : '';

/** 把文件名拆成主名与扩展名，扩展名弱化展示。 */
export const splitNoteName = (
  name: string,
): {
  /** 主名，不含扩展名 */
  base: string;
  /** 扩展名，含点号；没有扩展名时为空串 */
  extension: string;
} => {
  const index = name.lastIndexOf('.');

  if (index <= 0) {
    return { base: name, extension: '' };
  }

  return { base: name.slice(0, index), extension: name.slice(index) };
};

/** 列标题已经写明分类，列表里去掉重复的分类前缀。 */
export const stripCategoryPrefix = (base: string, category: string): string =>
  base.startsWith(`${category}-`) ? base.slice(category.length + 1) : base;

/**
 * 把笔记按类分列：一次遍历建 Map，并顺手记下每篇的时间戳，
 * 排序时只查表，不在比较函数里反复解析时间串。每列按更新时间倒序（新的在前），
 * 同一时间再按文件名升序，保证刷新前后顺序稳定。
 *
 * 列的顺序与标题来自 `plan`（记录仓库的分类清单），本函数不维护分类表；
 * 空列也返回（笔记为空），由看板自己决定「这一列为空」还是「整目录为空」。
 */
export const groupNotesByCategory = (
  notes: NoteSummary[],
  plan: NoteCategoryPlan,
): NoteColumn[] => {
  const byCategory = new Map<string, NoteSummary[]>();
  const updatedAt = new Map<string, number>();

  for (const note of notes) {
    if (!plan.isVisible(note.categoryKey)) {
      continue;
    }

    const bucket = byCategory.get(note.categoryKey) ?? [];

    bucket[bucket.length] = note;
    byCategory.set(note.categoryKey, bucket);
    updatedAt.set(note.name, toNoteTimestamp(note.updatedAt));
  }

  return plan.columns.map(({ key, label }) => ({
    key,
    label,
    notes: (byCategory.get(key) ?? []).toSorted(
      (a, b) =>
        (updatedAt.get(b.name) ?? 0) - (updatedAt.get(a.name) ?? 0) ||
        a.name.localeCompare(b.name),
    ),
  }));
};

/**
 * 把笔记摊平成表格的一行一篇：只保留会在页面上展示的分类，分类中文标题、
 * 时间文案在这里一次算好，组件只管渲染，不在 cell 里重复换算。
 * 排序交给 `sortNoteRows`，摊平结果本身不带顺序含义。
 */
export const toNoteRows = (
  notes: NoteSummary[],
  plan: NoteCategoryPlan,
): NoteRow[] =>
  notes.flatMap((note) => {
    const { categoryKey } = note;

    if (!plan.isVisible(categoryKey)) {
      return [];
    }

    const updatedAt = toNoteTimestamp(note.updatedAt);

    return [
      {
        note,
        categoryKey,
        categoryLabel: plan.labels.get(categoryKey) ?? categoryKey,
        topicLabel: note.topic,
        updatedLabel: formatNoteUpdatedAt(updatedAt),
        updatedAt,
      },
    ];
  });

/**
 * 按当前排序状态给表格行排序：
 * 「更新时间」按时间戳比较，「分类」按分类清单里的列顺序而不是中文拼音序，
 * 随后方向取反；主键相同时固定按更新时间倒序、再按文件名升序，保证顺序稳定。
 */
export const sortNoteRows = (
  rows: NoteRow[],
  sort: NotesSort,
  plan: NoteCategoryPlan,
): NoteRow[] => {
  const factor = sort.direction === 'asc' ? 1 : -1;
  /** 未在清单里的分类排在最后；不可能出现时用列数兜住 */
  const orderOf = (key: string): number =>
    plan.orders.get(key) ?? plan.columns.length;

  return rows.toSorted((a, b) => {
    const primary =
      sort.key === 'category'
        ? orderOf(a.categoryKey) - orderOf(b.categoryKey)
        : a.updatedAt - b.updatedAt;

    if (primary !== 0) {
      return primary * factor;
    }

    return b.updatedAt - a.updatedAt || a.note.name.localeCompare(b.note.name);
  });
};

/** 判断事件目标是不是正在输入的控件（那里交给浏览器自己的撤销） */
export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
