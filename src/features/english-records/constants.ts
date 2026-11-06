/**
 * 英语记录模块的固定配置：分类的展示顺序与名称。
 * 与 learn-english 仓库的分类文件一一对应。
 */

/** 分类键：与仓库 learning-records/<category>.json 同名 */
export type CategoryKey =
  | 'errors'
  | 'vocabulary'
  | 'phrases'
  | 'grammar'
  | 'usage'
  | 'pronunciation';

/** 分类的展示顺序与中文名称 */
export const CATEGORY_LIST: Array<{ key: CategoryKey; label: string }> = [
  { key: 'errors', label: '错题' },
  { key: 'vocabulary', label: '词汇' },
  { key: 'phrases', label: '短语' },
  { key: 'grammar', label: '语法' },
  { key: 'usage', label: '用法' },
  { key: 'pronunciation', label: '发音' },
];

/** 状态的展示元信息 */
export type StatusMeta = {
  /** 中文名称 */
  label: string;
  /** 等级（用于批注槽里的等级条数量） */
  level: number;
};

/** 全部状态的展示元信息 */
export const STATUS_META: Record<'learning' | 'familiar' | 'mastered', StatusMeta> =
  {
    learning: { label: '学习中', level: 1 },
    familiar: { label: '熟悉', level: 2 },
    mastered: { label: '已掌握', level: 3 },
  };

/** 未识别分类的兜底名称 */
export const UNKNOWN_CATEGORY_LABEL = '其它';
