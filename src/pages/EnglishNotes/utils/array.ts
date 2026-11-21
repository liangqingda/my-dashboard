/**
 * 英语笔记模块的数组工具（替换某一项但不原地修改）。
 */

/** 替换数组某一项，返回新数组；越界时行为等同 map 不命中 */
export const replaceAt = <T,>(list: T[], index: number, item: T): T[] =>
  list.map((entry, entryIndex) => (entryIndex === index ? item : entry));
