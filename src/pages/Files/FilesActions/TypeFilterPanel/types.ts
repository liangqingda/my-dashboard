import type { FileCategory } from '../../types';

/**
 * 筛选弹层面板的入参：可选项、已选分类、关键词与各自变更回调由按钮组层传入，
 * 面板只排关键词输入、分类 checkbox 列表与底部重置。
 */
export type TypeFilterPanelProps = {
  /** 当前列表里实际出现过的分类选项 */
  options: { value: FileCategory; label: string }[];
  /** 已选分类；空数组表示不过滤 */
  selected: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 切换已选分类 */
  onChange: (next: FileCategory[]) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 清空全部筛选条件（分类 + 关键词） */
  onReset: () => void;
};
