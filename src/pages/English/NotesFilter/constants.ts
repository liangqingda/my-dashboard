import type { CSSProperties } from '@mantine/core';

import type { NotesRangeOption } from './types';

/** 时间范围的六档：顺序即展示顺序，口径都是「按笔记更新时间」 */
export const RANGE_OPTIONS: NotesRangeOption[] = [
  {
    value: 'all',
    label: '全部时间',
    description: '不限更新时间',
  },
  {
    value: 'hour',
    label: '最近 1 小时',
    description: '只留最近 1 小时更新过的笔记',
  },
  {
    value: 'day',
    label: '最近 1 天',
    description: '只留最近 1 天更新过的笔记',
  },
  {
    value: 'week',
    label: '最近 1 周',
    description: '只留最近 1 周更新过的笔记',
  },
  {
    value: 'month',
    label: '最近 1 个月',
    description: '只留最近 1 个月更新过的笔记',
  },
  {
    value: 'date',
    label: '指定日期',
    description: '只留选中那天更新过的笔记',
  },
];

/** 下拉里只放档名：口径说明太长，塞进选项会把下拉撑宽，改在下方单行说明 */
export const RANGE_SELECT_DATA = RANGE_OPTIONS.map(({ label, value }) => ({
  label,
  value,
}));

/**
 * 字段标题与控件之间再加一点：组件库只靠标题行高留白（13px 字站在 1.55 行高里），
 * 视觉上贴着输入框。与预览弹窗的筛选面板用同一份数值。
 */
export const FIELD_STYLES: Record<'label', CSSProperties> = {
  label: { marginBottom: 4 },
};
