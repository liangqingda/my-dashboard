/**
 * 英语笔记模块的纯工具函数：分类归属、看板分列、排序、文件名展示与编辑态序列化。
 */

import { formatDateTime } from '@/utils/format';

import type {
  EnglishNote,
  NoteCategoryPlan,
  NoteColumn,
  NoteRow,
  NotesSort,
} from '../types';
import { NOTES_DIR } from '../constants';

import { getNoteCategoryKey } from './category';

/** 正文「基础信息」表里的更新时间行：`<tr><td>笔记更新时间</td><td>2026-11-08 14:39</td></tr>` */
const NOTE_UPDATED_AT_PATTERN = /笔记更新时间[\s\S]{0,40}?<td>([^<]+)</u;

/** 正文「基础信息」表里的目标知识点行：`<tr><td>目标知识点</td><td>out west 不是 outwest</td></tr>` */
const NOTE_TOPIC_PATTERN = /目标知识点[\s\S]{0,40}?<td>([^<]*)</u;

/** 取出第一个捕获组并去空白；没匹配到返回空串 */
const readCell = (pattern: RegExp, content: string): string =>
  (pattern.exec(content)?.[1] ?? '').trim();

/** 「2026-11-08 14:39」这类正文时间补成可解析的 ISO 串；日期带秒的按原样解析 */
const toIsoDateTime = (text: string): string => {
  const trimmed = text.trim();
  const iso = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(iso) ? `${iso}:00` : iso;
};

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
 * 笔记「笔记更新时间」，用于列内排序与表格展示。
 *
 * 优先取正文基础信息表里的字段：那是学习记录自己的更新时间，仓库被复制、拉取或换机器后
 * 文件 mtime 会跟着变，用它排序会让顺序跳来跳去；正文里没有这个字段时才退回 mtime。
 * 两者都取不到返回 0，调用方据此不渲染时间文案。
 */
export const getNoteUpdatedAt = (note: EnglishNote): number => {
  const fromContent = readCell(NOTE_UPDATED_AT_PATTERN, note.content);
  const parsed = fromContent ? Date.parse(toIsoDateTime(fromContent)) : 0;

  if (parsed > 0) {
    return parsed;
  }

  const fallback = Date.parse(note.updatedAt);

  return Number.isNaN(fallback) ? 0 : fallback;
};

/** 笔记的目标知识点（正文基础信息表里的字段），取不到返回空串 */
export const getNoteTopic = (note: EnglishNote): string =>
  readCell(NOTE_TOPIC_PATTERN, note.content);

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
 * 把笔记按类分列：一次遍历建 Map，并顺手记下每篇的「笔记更新时间」，
 * 排序时只查表，不在比较函数里反复解析正文。每列按更新时间倒序（新的在前），
 * 同一时间再按文件名升序，保证刷新前后顺序稳定。
 *
 * 列的顺序与标题来自 `plan`（记录仓库的分类清单），本函数不维护分类表；
 * 空列也返回（笔记为空），由看板自己决定「这一列为空」还是「整目录为空」。
 */
export const groupNotesByCategory = (
  notes: EnglishNote[],
  plan: NoteCategoryPlan,
): NoteColumn[] => {
  const byCategory = new Map<string, EnglishNote[]>();
  const updatedAt = new Map<string, number>();

  for (const note of notes) {
    const category = getNoteCategoryKey(note);

    if (!plan.isVisible(category)) {
      continue;
    }

    const bucket = byCategory.get(category) ?? [];

    bucket[bucket.length] = note;
    byCategory.set(category, bucket);
    updatedAt.set(note.name, getNoteUpdatedAt(note));
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
 * 把笔记摊平成表格的一行一篇：只保留会在页面上展示的分类，分类中文标题、目标知识点与
 * 时间文案在这里一次算好，组件只管渲染，不在 cell 里重复解析正文。
 * 排序交给 `sortNoteRows`，摊平结果本身不带顺序含义。
 */
export const toNoteRows = (
  notes: EnglishNote[],
  plan: NoteCategoryPlan,
): NoteRow[] =>
  notes.flatMap((note) => {
    const categoryKey = getNoteCategoryKey(note);

    if (!plan.isVisible(categoryKey)) {
      return [];
    }

    const updatedAt = getNoteUpdatedAt(note);

    return [
      {
        note,
        categoryKey,
        categoryLabel: plan.labels.get(categoryKey) ?? categoryKey,
        topicLabel: getNoteTopic(note),
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
