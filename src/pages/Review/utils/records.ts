/**
 * 复习库的纯函数：分类标题回填、掌握分格式化与筛选。
 * 都不依赖 React，列表与详情共用同一套展示口径。
 */

import { EMPTY_CELL } from '../constants';
import type { StatusFilter } from '../constants';
import type {
  RecordCategory,
  RecordCommit,
  RecordStatus,
  RecordSummary,
} from '../types';

/** 分类键 → 中文标题；清单里没声明的分类直接用键名兜底，不静默隐藏 */
export const buildCategoryLabels = (
  categories: RecordCategory[],
): Map<string, string> =>
  new Map(categories.map((category) => [category.key, category.label]));

/** 分类键的中文标题：清单缺这一项时回落键名 */
export const categoryLabel = (
  labels: Map<string, string>,
  key: string,
): string => labels.get(key) ?? key;

/** 状态筛选值 → 状态本身；`all` 返回 null 表示不过滤 */
const statusOfFilter = (filter: StatusFilter): RecordStatus | null =>
  filter === 'all' ? null : filter;

/** 按状态 + 分类筛选；分类为空串表示不按分类过滤 */
export const filterRecords = (
  records: RecordSummary[],
  status: StatusFilter,
  categoryKey: string,
): RecordSummary[] => {
  const wantedStatus = statusOfFilter(status);

  if (wantedStatus === null && categoryKey === '') {
    return records;
  }

  return records.filter(
    (record) =>
      (wantedStatus === null || record.status === wantedStatus) &&
      (categoryKey === '' || record.categoryKey === categoryKey),
  );
};

/** 掌握分展示：未评过分为占位，其余保留一位小数 */
export const formatScore = (score: number | null): string =>
  score === null ? EMPTY_CELL : score.toFixed(1);

/** 筛选结果的计数文案：搜索 / 筛过之后显示「命中数 / 总数」 */
export const countLabel = (shown: number, total: number): string =>
  shown === total ? `共 ${total} 条` : `筛出 ${shown} / ${total} 条`;

/**
 * 删除后那条提示：记录已经删掉了，但提交 / 推送可能没成——一层层如实说，
 * 别把「没有 hash」当成「没有提交」直接吞掉。
 */
export const describeDelete = (commit: RecordCommit): string => {
  if (commit.error) {
    return `记录已删除，但自动提交失败：${commit.error}`;
  }

  if (!commit.hash) {
    return '记录已删除';
  }

  if (commit.pushError) {
    return `记录已删除并提交 ${commit.hash}（${commit.pushError}）`;
  }

  return `记录已删除，已提交并推送 ${commit.hash}`;
};
