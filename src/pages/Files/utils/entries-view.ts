/**
 * 列表视图的组装与状态判定：把「筛完还剩哪些条目」和「此刻该给骨架 / 空态 / 引导」
 * 两块纯计算从页面里挪出来，页面只接结果。
 */

import type {
  AppEntry,
  DirListing,
  FileCategory,
  FileEntry,
  FilesRow,
  FolderEntry,
} from '../types';

import {
  filterAppsByCategory,
  filterAppsByKeyword,
  filterFilesByCategory,
  filterFilesByKeyword,
  filterFoldersByCategory,
  toFilesRows,
} from './files';

/** 一行对应的条目：三种形态共用名称列与操作列 */
export const entryOf = (row: FilesRow): AppEntry | FileEntry | FolderEntry => {
  switch (row.kind) {
    case 'folder':
      return row.folder;
    case 'app':
      return row.app;
    case 'file':
      return row.file;
  }
};

/** 一次筛选后的可见条目：三份列表 + 表格要的合并行 */
export type VisibleEntries = {
  visibleFolders: FolderEntry[];
  visibleApps: AppEntry[];
  visibleFiles: FileEntry[];
  rows: FilesRow[];
};

/** 分组的条目类型：与表格行的 kind 同一套 */
export type EntryGroupKey = FilesRow['kind'];

/** 分组的固定顺序：文件夹 → 应用 → 文件，与平铺顺序一致 */
export const ENTRY_GROUP_KEYS: readonly EntryGroupKey[] = [
  'folder',
  'app',
  'file',
];

/** 一个非空分组：标题取 `ENTRY_KIND_LABELS[key]` */
export type EntryGroup<T> = {
  key: EntryGroupKey;
  entries: T[];
};

/** 把表格行按类型归进固定顺序的分组；空组丢掉，顺序与平铺一致 */
export const groupFilesRows = (rows: FilesRow[]): EntryGroup<FilesRow>[] => {
  const buckets: Record<EntryGroupKey, FilesRow[]> = {
    app: [],
    file: [],
    folder: [],
  };

  for (const row of rows) {
    buckets[row.kind] = [...buckets[row.kind], row];
  }

  return ENTRY_GROUP_KEYS.map((key) => ({
    entries: buckets[key],
    key,
  })).filter((group) => group.entries.length > 0);
};

/** 按类型与关键词筛出这一页要展示的条目；还没拿到目录时全为空 */
export const selectVisibleEntries = (
  listing: DirListing | null,
  selected: FileCategory[],
  keyword: string,
): VisibleEntries => {
  const visibleFiles = listing
    ? filterFilesByKeyword(
        filterFilesByCategory(listing.files, selected),
        keyword,
      )
    : [];
  const visibleApps = listing
    ? filterAppsByKeyword(filterAppsByCategory(listing.apps, selected), keyword)
    : [];
  const visibleFolders = listing
    ? filterFoldersByCategory(listing.folders, selected)
    : [];

  return {
    rows: toFilesRows(visibleFolders, visibleApps, visibleFiles),
    visibleApps,
    visibleFiles,
    visibleFolders,
  };
};

/** 页面各处占位态要的判定结果 */
export type ListState = {
  /** 首屏 / 切目录还没拿到对应目录的结果 */
  showSkeleton: boolean;
  showGridSkeleton: boolean;
  showTableSkeleton: boolean;
  /** 拿到结果但筛完一个条目都没有 */
  showEmpty: boolean;
  /** 还没选过目录：引导先填路径，不报错 */
  showPrompt: boolean;
};

/** 判定当前该给骨架、空态还是首次引导；目录已换但新结果未到时也算骨架 */
export const describeListState = (input: {
  listing: DirListing | null;
  currentDir: string;
  loading: boolean;
  error: string | null;
  isGridView: boolean;
  visibleCount: number;
}): ListState => {
  const showSkeleton =
    input.loading &&
    (input.listing === null || input.listing.path !== input.currentDir);
  const showEmpty =
    !showSkeleton &&
    input.listing !== null &&
    input.visibleCount === 0;
  const showPrompt =
    !showSkeleton && input.listing === null && input.error === null;

  return {
    showEmpty,
    showGridSkeleton: showSkeleton && input.isGridView,
    showPrompt,
    showSkeleton,
    showTableSkeleton: showSkeleton && !input.isGridView,
  };
};

/** 页面一次拿齐的东西：筛完的条目 + 此刻该给哪种占位态 */
export type FilesListModel = VisibleEntries & ListState;

/**
 * 两段计算看的是同一份目录与同一组筛选条件，页面里合成一次调用：
 * 少抄一遍入参，也保证「筛完几条」与「要不要给空态」用的是同一组可见条目。
 */
export const describeFilesList = (input: {
  listing: DirListing | null;
  selected: FileCategory[];
  keyword: string;
  currentDir: string;
  loading: boolean;
  error: string | null;
  isGridView: boolean;
}): FilesListModel => {
  const visible = selectVisibleEntries(input.listing, input.selected, input.keyword);

  return {
    ...visible,
    ...describeListState({
      currentDir: input.currentDir,
      error: input.error,
      isGridView: input.isGridView,
      listing: input.listing,
      loading: input.loading,
      visibleCount:
        visible.visibleApps.length +
        visible.visibleFiles.length +
        visible.visibleFolders.length,
    }),
  };
};
