/**
 * 英语笔记模块的纯工具函数。
 */

const momentFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** 把 ISO 时间格式化为「11/6 21:10」；空值或非法时间返回空串。 */
export const formatMoment = (iso: string): string => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return momentFormatter.format(date);
};
