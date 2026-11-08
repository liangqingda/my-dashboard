/**
 * 快捷命令弹窗的分组常量。
 */

/** 分组展示顺序 */
export const GROUP_ORDER = ['alias', 'postgres', 'redis', 'other'] as const;

/** 分组标题 */
export const GROUP_LABELS: Record<string, string> = {
  alias: '常用别名',
  postgres: 'PostgreSQL',
  redis: 'Redis',
  other: '其他函数',
};
