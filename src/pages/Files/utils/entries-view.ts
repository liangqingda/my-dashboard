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

/** 一次筛选后的可见条目：三份列表 + 表格要的合并行 */
export type VisibleEntries = {
  visibleFolders: FolderEntry[];
  visibleApps: AppEntry[];
  visibleFiles: FileEntry[];
  rows: FilesRow[];
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
