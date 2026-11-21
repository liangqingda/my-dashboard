/**
 * 复习库模块的常量：状态文案、筛选选项与占位符。
 * 分类的键与中文标题**不在这里**：唯一来源是记录仓库的 `categories.json`，由中间件随数据下发。
 */

import type { MantineColor } from '@mantine/core';

import type { RecordStatus } from './types';

/** 字段缺失时的占位，避免出现空单元格 */
export const EMPTY_CELL = '—';

/** 状态文案 */
export const STATUS_LABELS: Record<RecordStatus, string> = {
  familiar: '熟悉',
  learning: '学习中',
  mastered: '已掌握',
};

/** 状态徽标颜色：学习中低调、熟悉主色、已掌握用成功色 */
export const STATUS_COLORS: Record<RecordStatus, MantineColor> = {
  familiar: 'blue',
  learning: 'gray',
  mastered: 'teal',
};

/** 状态筛选值：`all` 表示不过滤 */
export type StatusFilter = 'all' | RecordStatus;

/** 状态筛选的分段选项：顺序按学习推进（学习中 → 熟悉 → 已掌握） */
export const STATUS_FILTERS: Array<{
  label: string;
  value: StatusFilter;
}> = [
  { label: '全部', value: 'all' },
  { label: '学习中', value: 'learning' },
  { label: '熟悉', value: 'familiar' },
  { label: '已掌握', value: 'mastered' },
];

/** 分类下拉里「不按分类筛选」的选项，值为空串 */
export const ALL_CATEGORIES = '';

/** 默认筛选：先看全部，按更新时间倒序 */
export const DEFAULT_STATUS_FILTER: StatusFilter = 'all';

/** 关键词搜索框的占位文案：说明能搜哪几类字段 */
export const SEARCH_PLACEHOLDER = '搜索标题 / 分类 / ID';

/** 搜索框宽度：够放下常见关键词，又不把筛选行挤换行 */
export const SEARCH_WIDTH = 208;

/** 首屏骨架屏的行数：只为给一个「正在读」的形状，不假装有数据 */
export const SKELETON_ROWS: readonly number[] = [0, 1, 2, 3, 4];

/** 记录详情弹窗的全屏偏好：与 md 预览各记各的，互不影响 */
export const RECORD_FULLSCREEN_STORAGE_KEY = 'my-dashboard:review:fullscreen';
