import type { FileCategory } from '../../types';

/**
 * 类型筛选弹层面板的入参：可选项、已选项与变更回调由工具栏层传入，
 * 面板只排 checkbox 列表与底部重置。
 */
export type TypeFilterPanelProps = {
  /** 当前列表里实际出现过的分类选项 */
  options: { value: FileCategory; label: string }[];
  /** 已选分类；空数组表示不过滤 */
  selected: FileCategory[];
  /** 切换已选分类 */
  onChange: (next: FileCategory[]) => void;
};
