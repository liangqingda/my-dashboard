import type { FileCategory, TypeFilterMode } from '../../types';

/**
 * 筛选弹层面板的入参：当前操作方式、已勾选分类、关键词与各自变更回调由按钮组层传入，
 * 面板只排关键词输入、固定的「全部 + 分类」列表与底部重置。
 */
export type TypeFilterPanelProps = {
  /** 多选（勾多个）/ 单选（一次一类） */
  mode: TypeFilterMode;
  /** 已勾选的分类；全选就是六类都在 */
  selected: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 换一批勾选的分类 */
  onChange: (next: FileCategory[]) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 清空全部筛选条件（分类回到全选 + 清空关键词） */
  onReset: () => void;
};
