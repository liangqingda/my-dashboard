/**
 * 文件浏览页的纯函数：文件大小格式化、路径分段、类型筛选。不依赖 React。
 */

import { FILE_CATEGORY_OPTIONS } from '../constants';
import type { FileCategory, FileEntry } from '../types';

/** 字节数 → 可读体积（B / KB / MB / GB）；负数与 NaN 按 0 处理 */
export const formatFileSize = (bytes: number): string => {
  const size = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ['KB', 'MB', 'GB'] as const;
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
};

/** 面包屑的一段：目录名 + 该段对应的绝对路径 */
export type PathSegment = {
  label: string;
  path: string;
};

/** 把绝对路径拆成可点击的分段；空串返回空数组 */
export const splitPathSegments = (dir: string): PathSegment[] => {
  const parts = dir.split('/').filter(Boolean);

  return parts.map((part, index) => ({
    label: part,
    path: `/${parts.slice(0, index + 1).join('/')}`,
  }));
};

/** 按已选分类过滤文件；空选择表示不过滤，整份保留 */
export const filterFilesByCategory = (
  files: FileEntry[],
  selected: FileCategory[],
): FileEntry[] => {
  if (selected.length === 0) {
    return files;
  }

  const picked = new Set(selected);

  return files.filter((file) => picked.has(file.category));
};

/** 当前列表里实际出现过的分类，按固定选项顺序给出下拉项；都没出现时返回空 */
export const availableCategoryOptions = (files: FileEntry[]) => {
  const present = new Set(files.map((file) => file.category));

  return FILE_CATEGORY_OPTIONS.filter((option) => present.has(option.value));
};

/** 按文件名关键词过滤；空白关键词表示不过滤，整份保留。大小写不敏感子串匹配 */
export const filterFilesByKeyword = (
  files: FileEntry[],
  keyword: string,
): FileEntry[] => {
  const query = keyword.trim().toLowerCase();

  if (query === '') {
    return files;
  }

  return files.filter((file) => file.name.toLowerCase().includes(query));
};
