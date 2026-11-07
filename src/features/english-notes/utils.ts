/**
 * 英语笔记模块的纯工具函数。
 */

/** 从文件名取分类前缀：`errors-back-west-spacing.md` → `errors`。 */
export const getNoteCategory = (name: string): string => {
  const separator = name.indexOf('-');

  return separator > 0 ? name.slice(0, separator) : '';
};
