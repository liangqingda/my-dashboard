/**
 * 文件浏览页的纯函数：文件大小格式化、路径分段、类型筛选。不依赖 React。
 */

import { FILE_CATEGORY_VALUES } from '../constants';
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

/** 分类是否全选：筛选列表的「全部」勾选框与列表过滤共用这一个判据 */
export const isTypeFilterAllSelected = (selected: FileCategory[]): boolean =>
  selected.length === FILE_CATEGORY_VALUES.length;

/** 空态文案：没勾类型 / 只勾 App / 有关键词或部分类型 / 真的空目录，四种口径 */
export const emptyListingText = (
  selected: FileCategory[],
  keyword: string,
): string => {
  if (selected.length === 0) {
    return '筛选里一个类型都没勾，勾上要看的类型或点「全部」';
  }

  if (selected.length === 1 && selected[0] === 'app') {
    return '这个目录里没有应用，可点收藏里的「系统应用程序」去 /Applications';
  }

  if (keyword.trim() !== '' || !isTypeFilterAllSelected(selected)) {
    return '没有符合筛选条件的条目';
  }

  return '这个目录里没有文件或子文件夹';
};

/** 按已勾选的分类过滤文件：全选整份保留，否则只留勾选的类 */
export const filterFilesByCategory = (
  files: FileEntry[],
  selected: FileCategory[],
): FileEntry[] => {
  if (isTypeFilterAllSelected(selected)) {
    return files;
  }

  const shown = new Set(selected);

  return files.filter((file) => shown.has(file.category));
};

/** 按已勾选的分类过滤应用：勾了「App」才列出来，没勾就整份隐藏 */
export const filterAppsByCategory = (
  apps: AppEntry[],
  selected: FileCategory[],
): AppEntry[] => (selected.includes('app') ? apps : []);

/**
 * 按已勾选的分类过滤文件夹：全选整份保留；否则只留内含「勾选的某个文件类型」的文件夹
 * （含深层，靠中间件给的分类摘要）。「App」是独立条目类型——文件夹本身不是应用，
 * 只勾了 App 时不列文件夹，避免「选了 App 还满屏文件夹」。
 */
export const filterFoldersByCategory = (
  folders: FolderEntry[],
  selected: FileCategory[],
): FolderEntry[] => {
  if (isTypeFilterAllSelected(selected)) {
    return folders;
  }

  const relevant: FileCategory[] = selected.filter(
    (category) => category !== 'app',
  );

  if (relevant.length === 0) {
    return [];
  }

  return folders.filter((folder) =>
    folder.categories.some((category) => relevant.includes(category)),
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
