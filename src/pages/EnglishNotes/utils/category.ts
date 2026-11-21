/**
 * 分类归属：把记录仓库的分类清单摊成看板列，并判断某篇笔记的分类要不要展示。
 *
 * 分类**不是本项目的事实**：分类键由读盘侧的插件从正文「记录 ID / 试卷 ID」前缀解析
 * （文件名兜底），中文标题与列顺序来自记录仓库 `learning-record-notes/categories.json`。
 * 这里只做读取与兜底，不维护第二份分类表——记录仓库加一个分类，页面自动多一列。
 */

import type { NoteCategory, NoteCategoryPlan, NoteSummary } from '../types';

/** 认不出分类时的列表标题 */
const UNCATEGORIZED_LABEL = '未分类';

/**
 * 按「笔记里出现的分类键 + 记录仓库的分类清单」算出看板列。
 *
 * - 清单里没标 `hidden` 的分类按声明顺序成列（空列也保留，用来区分「整目录为空」）；
 * - 清单里标了 `hidden` 的分类（如套题 `paper`）不在看板与表格里展示；
 * - 笔记里出现、但清单没声明的分类键**不当脏数据丢掉**，按键名追加在末尾，
 *   页面能看见它，也就不会出现「改分类后笔记静默消失」；
 * - 清单整体缺失时全部按出现的键成列，标题回落成键名；
 * - 连记录 ID 和文件名都认不出分类的笔记归到末尾的「未分类」列。
 */
export const buildCategoryPlan = (
  notes: NoteSummary[],
  config: NoteCategory[],
): NoteCategoryPlan => {
  const declaredKeys = new Set(config.map((category) => category.key));
  /** 笔记里出现的分类键：用键当 Map 的键去重，靠构造出新数组而不是往数组里追加 */
  const discovered = new Map<string, true>();

  for (const note of notes) {
    discovered.set(note.categoryKey, true);
  }

  const discoveredKeys = [...discovered.keys()];
  const declared = config.filter((category) => !category.hidden);
  const undeclared = discoveredKeys
    .filter((key) => key !== '' && !declaredKeys.has(key))
    .toSorted((a, b) => a.localeCompare(b));
  const uncategorized: NoteCategory[] = discoveredKeys.includes('')
    ? [{ key: '', label: UNCATEGORIZED_LABEL }]
    : [];
  const columns: NoteCategory[] = [
    ...declared,
    ...undeclared.map((key) => ({ key, label: key })),
    ...uncategorized,
  ];
  const visibleKeys = new Set(columns.map((column) => column.key));

  return {
    columns,
    labels: new Map(columns.map((column) => [column.key, column.label])),
    orders: new Map(columns.map((column, index) => [column.key, index])),
    isVisible: (key) => visibleKeys.has(key),
  };
};
