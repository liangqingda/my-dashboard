/**
 * 英语记录模块的纯工具函数：日期格式化、复习排期判断、搜索与排序。
 * 与界面无关，组件和 hook 共用。
 */

import {
  CATEGORY_LIST,
  UNKNOWN_CATEGORY_LABEL,
} from '@/features/english-records/constants';
import type { EnglishRecord } from '@/features/english-records/types';

/** 一天的毫秒数 */
const DAY = 86_400_000;

/** 排序方式：最近学习 / 掌握分数 / 下次复习 */
export type SortKey = 'recent' | 'score' | 'due';

const dayFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
});
const fullDayFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
const momentFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** 拼装 className，忽略 false / null / undefined。 */
export const cx = (
  ...values: Array<string | false | null | undefined>
): string => values.filter(Boolean).join(' ');

/** 把 ISO 时间解析为 Date；空值或非法时间返回 null。 */
export const parseDate = (iso: string | null): Date | null => {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/** 取某个时间的当天 0 点，用于按「天」比较复习排期。 */
const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** 目标日期距今天相差多少个整天；正数表示已经过去，0 表示今天。 */
export const daysSince = (iso: string): number => {
  const date = parseDate(iso);

  if (!date) {
    return -1;
  }

  return Math.floor(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / DAY,
  );
};

/** 格式化为「11/3」，跨年时补年份。 */
export const formatDay = (iso: string | null): string => {
  const date = parseDate(iso);

  if (!date) {
    return '';
  }

  return date.getFullYear() === new Date().getFullYear()
    ? dayFormatter.format(date)
    : fullDayFormatter.format(date);
};

/** 格式化为「11/3 14:02」，用于时间线。 */
export const formatMoment = (iso: string | null): string => {
  const date = parseDate(iso);

  if (!date) {
    return '';
  }

  return momentFormatter.format(date);
};

/** 分类的中文名称。 */
export const categoryLabel = (category: string): string =>
  CATEGORY_LIST.find((item) => item.key === category)?.label ??
  UNKNOWN_CATEGORY_LABEL;

/** 分类在索引栏中的排位。 */
export const categoryOrder = (category: string): number => {
  const index = CATEGORY_LIST.findIndex((item) => item.key === category);

  return index === -1 ? CATEGORY_LIST.length : index;
};

/** 记录是否已到复习日期。 */
export const isReviewDue = (record: EnglishRecord): boolean =>
  record.nextReviewAt !== null && daysSince(record.nextReviewAt) >= 0;

/** 复习排期的一句话说明，如「已逾期 3 天」「今天到期」「11/3 复习」。 */
export const reviewLabel = (record: EnglishRecord): string => {
  if (!record.nextReviewAt) {
    return '未排期';
  }

  const days = daysSince(record.nextReviewAt);

  if (days > 0) {
    return `已逾期 ${days} 天`;
  }

  if (days === 0) {
    return '今天到期';
  }

  return `${formatDay(record.nextReviewAt)} 复习`;
};

/** 记录的最近活动时间：优先最近学习，其次掌握时间。 */
const lastActivity = (record: EnglishRecord): string | null =>
  record.lastLearnedAt ?? record.masteredAt;

/** 取时间戳，空值为 0，便于稳定排序。 */
const timestamp = (iso: string | null): number =>
  parseDate(iso)?.getTime() ?? 0;

/** 按搜索词匹配记录：标题、讲解、原始输入、例句与标签。 */
export const matchesQuery = (record: EnglishRecord, query: string): boolean => {
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return (
    record.title.toLowerCase().includes(keyword) ||
    record.explanation.toLowerCase().includes(keyword) ||
    record.source.toLowerCase().includes(keyword) ||
    record.example.toLowerCase().includes(keyword) ||
    record.id.toLowerCase().includes(keyword) ||
    record.tags.some((tag) => tag.toLowerCase().includes(keyword))
  );
};

/** 按指定方式排序，返回新数组，不改动入参。 */
export const sortRecords = (
  records: EnglishRecord[],
  sort: SortKey,
): EnglishRecord[] => {
  if (sort === 'score') {
    return records.toSorted(
      (a, b) => (b.masteryScore ?? 10) - (a.masteryScore ?? 10),
    );
  }

  if (sort === 'due') {
    return records.toSorted((a, b) => {
      if (!a.nextReviewAt) {
        return 1;
      }

      if (!b.nextReviewAt) {
        return -1;
      }

      return timestamp(a.nextReviewAt) - timestamp(b.nextReviewAt);
    });
  }

  return records.toSorted(
    (a, b) => timestamp(lastActivity(b)) - timestamp(lastActivity(a)),
  );
};

/** 取出全部到期记录，按到期时间从早到晚排列（越久没复习越靠前）。 */
export const collectDueRecords = (records: EnglishRecord[]): EnglishRecord[] =>
  records
    .filter(isReviewDue)
    .toSorted(
      (a, b) => timestamp(a.nextReviewAt) - timestamp(b.nextReviewAt),
    );
