/**
 * 文件浏览页的纯函数：文件大小格式化、路径分段、类型筛选。不依赖 React。
 */

import type {
  AppEntry,
  DirSpace,
  FileCategory,
  FileEntry,
  FilesRow,
  FolderEntry,
} from '../types';

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

/** 字节数 → 卷的可用空间：两位小数，满 1000 GB 改用 TB（文件体积仍用 `formatFileSize`） */
export const formatAvailableSpace = (bytes: number): string => {
  const size = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;
  const gb = size / 1024 ** 3;

  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }

  return `${gb.toFixed(2)} GB`;
};

/**
 * 标题栏描述：先给本机剩余可用空间（「13.78 GB 可用」）；
 * 当前目录在外接卷上时再追加那一卷的名字与可用空间，让两个数字分得清是哪块盘。
 * 读不到空间时返回 undefined，标题行只留标题。
 */
export const describeDirSpace = (space: DirSpace | null): string | undefined => {
  if (space === null) {
    return undefined;
  }

  const system = `${formatAvailableSpace(space.system.freeBytes)} 可用`;

  if (space.external === null) {
    return system;
  }

  return `${system} · ${space.external.name ?? '外接盘'} ${formatAvailableSpace(space.external.freeBytes)} 可用`;
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

/** 按排除项过滤文件：去掉被排除的分类；空排除项表示全部显示，整份保留 */
export const filterFilesByCategory = (
  files: FileEntry[],
  excluded: FileCategory[],
): FileEntry[] => {
  if (excluded.length === 0) {
    return files;
  }

  const hidden = new Set(excluded);

  return files.filter((file) => !hidden.has(file.category));
};

/** 按排除项过滤应用：只有「App」这一档管它，取消勾选就把应用整份隐藏 */
export const filterAppsByCategory = (
  apps: AppEntry[],
  excluded: FileCategory[],
): AppEntry[] =>
  excluded.includes('app') ? [] : apps;

/**
 * 按排除项过滤文件夹：只要文件夹里还有没被排除的类型就留下（含深层，靠中间件给的分类摘要）；
 * 空排除项表示全部显示，整份保留，空文件夹也不例外。
 */
export const filterFoldersByCategory = (
  folders: FolderEntry[],
  excluded: FileCategory[],
): FolderEntry[] => {
  if (excluded.length === 0) {
    return folders;
  }

  const hidden = new Set(excluded);

  return folders.filter((folder) =>
    folder.categories.some((category) => !hidden.has(category)),
  );
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

/** 按应用显示名过滤；口径与文件关键词一致（大小写不敏感子串匹配） */
export const filterAppsByKeyword = (
  apps: AppEntry[],
  keyword: string,
): AppEntry[] => {
  const query = keyword.trim().toLowerCase();

  if (query === '') {
    return apps;
  }

  return apps.filter((app) => app.name.toLowerCase().includes(query));
};

/** 把筛选后的文件夹、应用与文件拼成表格行：文件夹在前、应用其次、文件在后，与网格同一顺序 */
export const toFilesRows = (
  folders: FolderEntry[],
  apps: AppEntry[],
  files: FileEntry[],
): FilesRow[] => [
  ...folders.map((folder) => ({ kind: 'folder' as const, folder })),
  ...apps.map((app) => ({ kind: 'app' as const, app })),
  ...files.map((file) => ({ kind: 'file' as const, file })),
];
