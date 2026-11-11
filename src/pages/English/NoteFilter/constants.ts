import type { CSSProperties } from '@mantine/core';

import type { NoteFilterScopeOption } from './types';

/** 筛选面板上的三档：顺序即展示顺序，文案与筛选口径（见 `utils/filter-markdown`）对齐 */
export const SCOPE_OPTIONS: NoteFilterScopeOption[] = [
  {
    description: '基础信息、讲解、每轮复习统计都在',
    label: '全部内容',
    value: 'all',
  },
  {
    description: '只留题目，藏起基础信息、讲解与每轮统计',
    label: '只看习题',
    value: 'exercise',
  },
  {
    description: '只留判定不是 ✅ 的题目',
    label: '只看错题',
    value: 'wrong',
  },
];

/**
 * 单选框的局部样式：面板只有 272px 宽，组件库默认的 16px 圆点在这排 13px 文案前太抢眼，
 * 说明文字又自带 8px 上间距，两行字被拉得不像同一个选项。这里把圆点收到 14px、
 * 说明贴着标题（2px）、两行行高收到 1.35，一块选项读起来才是一件东西。
 *
 * 尺寸改的是组件库自己在 root 上算好的变量（圆点、定位容器、图标都读它），
 * 不逐个改元素宽高，圆点与图标才会一起缩、仍然同心。
 * 用 `styles` 传内联样式而不是覆盖组件库类名：类名先后顺序在打包里不稳，内联一定生效。
 */
export const RADIO_STYLES: Record<
  'description' | 'label' | 'root',
  CSSProperties
> = {
  description: { fontSize: '0.75rem', lineHeight: 1.35, marginTop: 2 },
  label: { lineHeight: 1.35 },
  root: { '--radio-icon-size': '5px', '--radio-size': '14px' },
};
