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

/** 面包屑根的三种形态：本机磁盘根 / 当前用户主目录 / 外接卷 */
export type PathRootKind = 'computer' | 'home' | 'volume';

/** 面包屑根：根叫什么、回哪去，以及根之下还剩哪些分段 */
export type PathRoot = {
  kind: PathRootKind;
  /** 根的名字：本机 / 用户名 / 卷名 */
  label: string;
  /** 点根回到哪一层 */
  path: string;
  /** 根之下的分段（不含根自身） */
  segments: PathSegment[];
};

/**
 * 路径末段的目录名：收藏这类只要 `path` + `name` 的地方（拖拽弹窗里收藏当前层）用它补名字，
 * `/` 自身与末尾带斜杠的路径都兜住。
 */
export const baseNameOfPath = (dir: string): string => {
  const parts = dir.split('/').filter(Boolean);

  return parts.length === 0 ? dir : parts[parts.length - 1];
};

/** 收藏接口要的载荷：路径 + 末段名（弹窗里收藏当前层、页面里收藏选中项共用） */
export const favoriteTargetOf = (dir: string): { name: string; path: string } => ({
  name: baseNameOfPath(dir),
  path: dir,
});

/**
 * 按路径推出面包屑的根：`/Users/<用户>/…` 以主目录为根、`/Volumes/<卷>/…` 以该卷为根，
 * 其余以磁盘根 `/` 为根；根自身不再当作一段重复展示。只认这两类常见前缀，不猜别的挂载点。
 */
export const describePathRoot = (dir: string): PathRoot => {
  const parts = dir.split('/').filter(Boolean);
  const [first, second] = parts;

  if (first === 'Users' && parts.length >= 2) {
    return {
      kind: 'home',
      label: second,
      path: `/Users/${second}`,
      segments: splitPathSegments(dir).slice(2),
    };
  }

  if (first === 'Volumes' && parts.length >= 2) {
    return {
      kind: 'volume',
      label: second,
      path: `/Volumes/${second}`,
      segments: splitPathSegments(dir).slice(2),
    };
  }

  return {
    kind: 'computer',
    label: '本机',
    path: '/',
    segments: splitPathSegments(dir),
  };
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
 * （含深层，靠中间件给的分类摘要）。勾了「App」时另留**直属含应用包**的文件夹
 * （`hasApps`）——根目录下的 `/Applications` 这类应用目录要能点进去，系统应用目录即使
 * 这一层扫描没标出来也按应用目录处理；包里深层才有的 app
 * 不算，避免 `~/Library` 那种满屏文件夹又被筛出来。
 */
/** 系统应用目录：即使这一层扫描没拿到 `hasApps`，也只可能是放应用的目录，勾 App 时必须露出 */
const APP_CATALOG_PATHS = new Set(['/Applications', '/System/Applications']);

/**
 * 当前是不是应用目录本身（`/Applications`、`/System/Applications`）：
 * 这两种目录里的文件夹是应用包自带的目录，瓦片尺寸要和应用一样、别随窗口被拉大。
 */
export const isAppCatalogPath = (dir: string | null): boolean =>
  dir !== null && APP_CATALOG_PATHS.has(dir);

/**
 * 这个文件夹是不是「放应用的目录」（含 app 包，或本身就是系统应用目录）：
 * 网格据此把它的图标钉成与应用同尺寸，不随窗口被拉大。
 * 判据挂在文件夹自身上，比只看当前目录路径稳——应用目录换个入口进来也认得出。
 */
export const isAppFolder = (folder: FolderEntry): boolean =>
  folder.hasApps || APP_CATALOG_PATHS.has(folder.path);

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
  const wantApps = selected.includes('app');

  if (relevant.length === 0) {
    return folders.filter(isAppFolder);
  }

  return folders.filter(
    (folder) =>
      (wantApps && isAppFolder(folder)) ||
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
