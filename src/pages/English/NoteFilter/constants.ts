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

/** 下拉里只放档名：每档的口径太长，塞进选项会把下拉撑宽，改在下拉下方单行说明 */
export const SCOPE_SELECT_DATA = SCOPE_OPTIONS.map(({ label, value }) => ({
  label,
  value,
}));
