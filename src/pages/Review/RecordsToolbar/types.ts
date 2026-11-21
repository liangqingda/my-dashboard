import type { StatusFilter } from '../constants';

/** 列表顶部筛选行的入参：三个筛选值 + 计数文案，改动一律冒泡给页面 */
export type RecordsToolbarProps = {
  /** 状态筛选 */
  status: StatusFilter;
  /** 换状态筛选 */
  onStatusChange: (status: StatusFilter) => void;
  /** 分类下拉选项（清单里的分类 + 记录里出现过但未声明的键） */
  categoryOptions: Array<{ label: string; value: string }>;
  /** 当前分类；空串表示全部 */
  category: string;
  /** 换分类筛选 */
  onCategoryChange: (category: string) => void;
  /** 关键词 */
  keyword: string;
  /** 换关键词（空串表示清空） */
  onKeywordChange: (keyword: string) => void;
  /** 计数文案 */
  countText: string;
  /** 首次读取还在进行（还没有任何数据可显示） */
  loading: boolean;
  /** 记录总条数：为 0 且还在读取时显示「读取中…」 */
  total: number;
};
