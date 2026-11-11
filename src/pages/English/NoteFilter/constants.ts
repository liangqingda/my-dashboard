import type { CSSProperties } from '@mantine/core';

import type { NoteFilterScopeOption } from './types';

/** 筛选面板上的三档：顺序即展示顺序，文案与筛选口径（见 `utils/filter-markdown`）对齐 */
export const SCOPE_OPTIONS: NoteFilterScopeOption[] = [
  {
    description: '基础信息、讲解、统计表都在',
    label: '全部内容',
    value: 'all',
  },
  {
    description: '只留题目，藏起基础信息与讲解',
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
 * 单选框的局部样式：面板只有 272px 宽，组件库那套默认值在这里有四处不对味——
 *
 * 1. 圆点 16px 压过 13px 的文案，收到 14px（图标一起收成 5px）；
 * 2. 圆点默认跟着整块（标题 + 说明两行）垂直居中，看着既不像居中也不像顶对齐，
 *    这里改成 `flex-start` 再把圆点下移 2px，让它落在「标题第一行」的中线上；
 * 3. 圆点与文字的间距来自 label / 说明的 12px 左内边距，收到 8px；
 * 4. 说明文字自带 8px 上间距，两行字因此不像同一个选项，收到 2px、行高 1.35。
 *
 * 尺寸改组件库在 root 上算好的变量（圆点、定位容器、图标都读它），圆点与图标才会一起缩且同心。
 * 用 `styles` 传内联样式而不是覆盖组件库类名：类名先后顺序在打包里不稳，内联一定生效。
 */
export const RADIO_STYLES: Record<
  'body' | 'description' | 'inner' | 'label' | 'root',
  CSSProperties
> = {
  body: { alignItems: 'flex-start' },
  description: { fontSize: '0.75rem', lineHeight: 1.35, marginTop: 2 },
  /* 标题行高 1.35（13px → 17.5px），圆点 14px：(17.5 - 14) / 2 ≈ 2px，正好压着标题中线 */
  inner: { marginTop: 2 },
  label: { lineHeight: 1.35 },
  root: {
    '--label-offset-start': '8px',
    '--radio-icon-size': '5px',
    '--radio-size': '14px',
  },
};
