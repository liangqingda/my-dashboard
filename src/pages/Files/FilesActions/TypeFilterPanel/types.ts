import type { FileCategory } from '../../types';

/**
 * 筛选弹层面板的入参：排除项、关键词与各自变更回调由按钮组层传入，
 * 面板只排关键词输入、固定的分类 checkbox 列表与底部重置。
 */
export type TypeFilterPanelProps = {
  /** 被排除的分类（取消勾选的那些）；空数组表示全部显示 */
  excluded: FileCategory[];
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 切换排除项（取消 / 恢复勾选某一类） */
  onChange: (next: FileCategory[]) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 清空全部筛选条件（分类 + 关键词） */
  onReset: () => void;
};
