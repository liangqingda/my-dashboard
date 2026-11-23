import type { TypeFilterValue } from '../../types';

/**
 * 筛选弹层面板的入参：当前档位、关键词与各自变更回调由按钮组层传入，
 * 面板只排关键词输入、固定的「全部 + 分类」单选列表与底部重置。
 */
export type TypeFilterPanelProps = {
  /** 当前档位：`all` 表示全部，其余表示只看这一类 */
  active: TypeFilterValue;
  /** 文件名关键词；空串表示不按关键词过滤 */
  keyword: string;
  /** 切到某一档（含「全部」） */
  onChange: (next: TypeFilterValue) => void;
  /** 改动文件名关键词 */
  onKeywordChange: (value: string) => void;
  /** 清空全部筛选条件（档位回到「全部」+ 清空关键词） */
  onReset: () => void;
};
