/**
 * 文件页的状态编排：把目录取数、筛选、视图、分组、设置、预览、条目动作、拖拽、删除 / 卸载 /
 * 墙纸 / 推出盘这几组 hook 接到一起，页面组件只做拼装，不再在 `index.tsx` 里逐个接线。
 *
 * 这里只做组合与派生，不新增业务判定；各能力的口径仍归各自专属 hook（见同目录其它文件）。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { onPageRefresh } from '@/utils/page-refresh';

import type { FilesActionsPanel } from '../FilesActions/types';
import { describeFilesList } from '../utils/entries-view';
import { emptyListingText, isAppCatalogPath } from '../utils/files';

import { useAppLaunch } from './useAppLaunch';
import { useAppUninstall } from './useAppUninstall';
import { useDragPending } from './use-drag-pending';
import { useEntryActions } from './useEntryActions';
import { useEntryDelete } from './useEntryDelete';
import { useFilesDir } from './useFilesDir';
import { useFilesDrag } from './useFilesDrag';
import { useFilesFilterActions } from './useFilesFilterActions';
import { useGroupCollapse } from './useGroupCollapse';
import { useFilesLock } from './useFilesLock';
import { useFilesNavigation } from './useFilesNavigation';
import { useFilesSettings } from './useFilesSettings';
import { useFilesViewMode } from './useFilesViewMode';
import { useFavorites } from './useFavorites';
import { useImagePreview } from './useImagePreview';
import { useTypeFilter } from './useTypeFilter';
import { useVideoPreview } from './useVideoPreview';
import { useVolumeEject } from './useVolumeEject';
import { useWallpaper } from './useWallpaper';

export const useFilesPageState = () => {
  /** 收藏 hook 整个留着：拖拽弹窗里的收藏面板直接复用同一套动作 */
  const favoritesHook = useFavorites();
  const {
    favorites,
    isFavorite,
    moveFavorite,
    removeFavorite,
    toggleFavorite,
    togglePinnedFavorite,
  } = favoritesHook;
  /** 从没打开过目录时默认进收藏里的第一条（固定项在前）；推出外接盘也回到这里 */
  const defaultFavoriteDir = favorites[0]?.path ?? null;
  const {
    currentDir,
    listing,
    loading,
    error,
    openDir,
    pickDir,
    picking,
    refresh,
    reload,
  } = useFilesDir(defaultFavoriteDir);
  const typeFilter = useTypeFilter();
  const { onChange: onSelectedCategoriesChange, selected: selectedCategories } =
    typeFilter;
  /** 展示形式：网格 / 表格，切换入口在设置面板外观组里 */
  const { isGridView, setView, view } = useFilesViewMode();
  /** 分组折叠：会话内状态，网格 / 表格共用同一份收起集合 */
  const { collapsedGroups, toggleGroup } = useGroupCollapse();
  /** 文件页设置：点视频的去向、两扇预览是否默认全屏、页面安全锁 */
  const settings = useFilesSettings();
  /** 本次停留是否已经输对过密码：只在会话内有效，离开页面重新进就再问一次 */
  const { locked, unlock } = useFilesLock(settings.lockEnabled, settings.lockPassword);

  const folders = listing?.folders ?? [];
  const allFiles = listing?.files ?? [];
  /** 待拖拽区：攒起来的一批条目，攒下以后列表的点击语义跟着变 */
  const pending = useDragPending();
  const entryActions = useEntryActions({
    currentDir: listing?.path ?? null,
    currentFolders: folders,
    reload,
    // 整批搬完、弹窗自己关掉后，列表跟到最后落成的目录
    onAllMoved: openDir,
    // 弹窗里把一条「搬进文件夹」的取回手卡：同时加回待拖拽区，关窗后它还在
    onRestored: pending.add,
  });
  /** 应用卸载：点卸载先取残留清单，确认后删整包并清理残留 */
  const appUninstall = useAppUninstall(reload);
  const { launchApp, launchingPath } = useAppLaunch();
  /** 视频预览：点视频打开弹窗，翻篇 / 选集 / 截图都按当前目录的视频列表走；整个结果也给浮层层复用 */
  const videoPreview = useVideoPreview(listing, settings);
  const { closeVideo, openExternal: openVideoExternal, openVideo } = videoPreview;
  /** 图片预览：与视频预览同形，但没有播放 / 截图那一套；裁剪另存后重读目录以露出新文件夹 */
  const imagePreview = useImagePreview(listing, { onSaved: reload });
  const { closeImage, openImage } = imagePreview;
  /** 设为桌面墙纸：列表瓦片的 hover 按钮与预览 header 共用这一套确认流程 */
  const wallpaper = useWallpaper();
  /** 删除条目：整份结果也给浮层层复用（弹窗的字段从它挑） */
  const entryDelete = useEntryDelete(folders, allFiles, reload, (path) => {
    // 删掉的正好是预览中的那一张：先切到下一条（没有了才关窗）
    videoPreview.skipDeletedVideo(path);
    imagePreview.skipDeletedImage(path);
  });
  const { deletingEntry, requestDelete, resetDelete } = entryDelete;

  /** 列表拖拽的总接线：按设置分叉到「弹窗挑目标」与「直接拖到文件夹」两套 */
  const drag = useFilesDrag({
    entryActions,
    files: allFiles,
    folders,
    currentDir: listing?.path ?? '',
    moveMode: settings.moveMode,
    pending,
  });

  /** 同时只开一块弹层：收藏 / 筛选 */
  const [openPanel, setOpenPanel] = useState<FilesActionsPanel | null>(null);
  /** 文件名关键词；会话内状态，不持久化 */
  const [keyword, setKeyword] = useState('');

  // 页面标题栏的「刷新当前页面」：静默重读当前目录，失败由订阅方弹提示
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 当前目录作为收藏条目；还没选目录时为 null，收藏按钮禁用 */
  const currentEntry = listing ? { path: listing.path, name: listing.name } : null;

  /** 筛完的条目、表格要的合并行，以及骨架 / 空态 / 引导的判定 */
  const list = describeFilesList({
    currentDir,
    error,
    isGridView,
    keyword,
    listing,
    loading,
    selected: selectedCategories,
  });

  /**
   * 待拖拽区底部的「选择全部」：只收**当前列表里看得见的**那些（已过关键词与类型筛选）；
   * 应用包不参与移动，天然不在里面。
   */
  const handleSelectAll = useCallback(
    () => pending.addMany([...list.visibleFolders, ...list.visibleFiles]),
    [list.visibleFiles, list.visibleFolders, pending],
  );

  /** 待拖拽条目的路径集合：瓦片 / 表格行据此判断是否在待拖拽区里 */
  const pendingPaths = useMemo(
    () => pending.entries.map((entry) => entry.path),
    [pending.entries],
  );

  /** 切换某块弹层：再点一次同一块则收起 */
  const togglePanel = useCallback(
    (panel: FilesActionsPanel) =>
      setOpenPanel((prev) => (prev === panel ? null : panel)),
    [],
  );

  /** 目录导航：切目录前统一清掉临时状态（改名 / 拖拽 / 待删除 / 待卸载 / 预览） */
  const { goToDir, handlePickDir, navigateParent, openFolder, openingFolder } =
    useFilesNavigation({
      openDir,
      parentDir: listing?.parent ?? null,
      pickDir,
      resetTransientFns: [
        entryActions.resetTransient,
        resetDelete,
        appUninstall.reset,
        closeVideo,
        closeImage,
      ],
    });

  /** 推出外接盘：按钮只在当前目录确实落在外接卷上时出现；成功后回默认目录 */
  const volumeEject = useVolumeEject({
    currentDir,
    external: listing?.space?.external ?? null,
    fallbackDir: defaultFavoriteDir,
    onBeforeEject: () => {
      closeVideo();
      closeImage();
    },
    onNavigate: goToDir,
  });

  /** 只勾 App 自动切到系统应用目录；多选切单选时收敛成全部 */
  const { changeFilterMode, changeSelectedCategories } = useFilesFilterActions({
    currentPath: listing?.path ?? null,
    onSelectedCategoriesChange,
    openDir: goToDir,
    selectedCategories,
    setFilterMode: settings.setFilterMode,
  });

  /** 空态文案：筛过条件与真的空目录给不同一句话；不是空态就是 null */
  const emptyText = list.showEmpty
    ? emptyListingText(selectedCategories, keyword)
    : null;

  const fixedColumns = listing !== null && isAppCatalogPath(listing.path);

  return {
    appUninstall,
    closeImage,
    closeVideo,
    collapsedGroups,
    currentDir,
    currentEntry,
    deletingEntry,
    drag,
    emptyText,
    error,
    favorites,
    favoritesHook,
    filterActions: { changeFilterMode, changeSelectedCategories },
    fixedColumns,
    goToDir,
    handlePickDir,
    handleSelectAll,
    imagePreview,
    isFavorite,
    isGridView,
    keyword,
    launchApp,
    launchingPath,
    list,
    listing,
    loading,
    loadingFolder: openingFolder,
    locked,
    moveFavorite,
    navigateParent,
    openFolder,
    openImage,
    openPanel,
    openVideo,
    openVideoExternal,
    pending,
    pendingPaths,
    picking,
    refresh,
    reload,
    removeFavorite,
    requestDelete,
    resetDelete,
    selectedCategories,
    settings,
    setKeyword,
    setOpenPanel,
    setView,
    toggleFavorite,
    toggleGroup,
    togglePinnedFavorite,
    togglePanel,
    entryActions,
    entryDelete,
    unlock,
    videoPreview,
    videoApp: settings.videoApp,
    videoOpenMode: settings.videoOpenMode,
    videoThumbStyle: settings.videoThumbStyle,
    view,
    volumeEject,
    wallpaper,
  };
};
