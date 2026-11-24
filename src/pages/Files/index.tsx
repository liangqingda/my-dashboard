import { useEffect, useState } from 'react';
import { Stack } from '@mantine/core';

import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

import DirBreadcrumb from './DirBreadcrumb';
import FilesActions from './FilesActions';
import type { FilesActionsPanel } from './FilesActions/types';
import FilesEntries from './FilesEntries';
import FilesModals from './FilesModals';
import FilesPreviewLayers from './FilesPreviewLayers';
import FilesStates from './FilesStates';
import { FILES_STORAGE_SCOPE } from './constants';
import { useAppLaunch } from './hooks/useAppLaunch';
import { useAppUninstall } from './hooks/useAppUninstall';
import { useEntryActions } from './hooks/useEntryActions';
import { useEntryDelete } from './hooks/useEntryDelete';
import { useFilesSettings } from './hooks/useFilesSettings';
import { useFavorites } from './hooks/useFavorites';
import { useFilesDir } from './hooks/useFilesDir';
import { useFilesFilterActions } from './hooks/useFilesFilterActions';
import { useFilesViewMode } from './hooks/useFilesViewMode';
import { useFilesNavigation } from './hooks/useFilesNavigation';
import { useImagePreview } from './hooks/useImagePreview';
import { useTypeFilter } from './hooks/useTypeFilter';
import { useVideoPreview } from './hooks/useVideoPreview';
import { useVolumeEject } from './hooks/useVolumeEject';
import {
  describeDirSpace,
  emptyListingText,
} from './utils/files';
import {
  describeListState,
  selectVisibleEntries,
} from './utils/entries-view';

import styles from './index.scss';

/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹、应用包与文件，不限文件类型；
 * 应用包按一条应用展示（真实图标 + 卸载入口），不当作可进入的文件夹。
 * 标题栏的图标按钮可在网格与表格（名称 / 类别 / 操作三列）两种展示形式之间切换，结果记在 localStorage。
 * 点文件夹进入下一层，面包屑回退，`⌘↑` 回上一级；可收藏常用目录，在收藏面板里点选直达；
 * 拖起任一条目会打开移动弹窗：弹窗里逐层挑目标文件夹，底部取消区可退回最外层或取消整次移动。
 * 标题栏筛选面板支持按名称关键词过滤与按类型勾选，取消勾选的类型连同对应文件夹一起隐藏。
 * 列表只列摘要；点视频条目会在弹窗里播放（设置里可改成交给外部播放器），
 * 点图片条目会在同形的弹窗里预览，两者的翻篇与目录侧栏都基于当前目录的同类列表（视频另有截图）。
 * 应用 hover 后右上角给卸载按钮，二次确认里先列清要删的残留，确认后由中间件删整包并清理缓存 / 配置 / 数据。
 * 目录读取走 Vite 中间件，仅开发模式可用。
 * 标题行右侧再显示本机剩余可用空间；当前目录在外接盘上时，连同那块盘的可用空间一起显示。
 */
const Files = () => {
  const {
    favorites,
    isFavorite,
    moveFavorite,
    removeFavorite,
    toggleFavorite,
    togglePinnedFavorite,
  } = useFavorites();
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
  const {
    onChange: onSelectedCategoriesChange,
    selected: selectedCategories,
  } = useTypeFilter();
  /** 展示形式：网格 / 表格，切换按钮在标题栏 */
  const { isGridView, toggle: toggleViewMode } = useFilesViewMode();
  /** 文件页设置（放在视频预览之前）：点视频的去向、两扇预览是否默认全屏 */
  const settings = useFilesSettings();

  const folders = listing?.folders ?? [];
  const allFiles = listing?.files ?? [];
  const entryActions = useEntryActions({
    currentDir: listing?.path ?? null,
    currentFolders: folders,
    reload,
  });
  /** 应用卸载：点卸载先取残留清单，确认后删整包并清理残留 */
  const appUninstall = useAppUninstall(reload);
  const { launchApp, launchingPath } = useAppLaunch();
  /** 视频预览：点视频打开弹窗，翻篇 / 侧栏 / 截图都按当前目录的视频列表走 */
  const {
    activeId: previewVideoId,
    captureFrame,
    closeVideo,
    items: videoItems,
    openExternal: openVideoExternal,
    openVideo,
    pickCaptureDir,
    selectVideo,
  } = useVideoPreview(listing, settings);
  /** 图片预览：与视频预览同形，但没有播放 / 截图那一套 */
  const {
    activeId: previewImageId,
    closeImage,
    items: imageItems,
    openImage,
    selectImage,
  } = useImagePreview(listing);
  const {
    cancelDelete,
    confirmDelete,
    deletingEntry,
    deleteLoading,
    requestDelete,
    resetDelete,
  } = useEntryDelete(folders, allFiles, reload);

  /** 同时只开一块弹层：收藏 / 筛选 */
  const [openPanel, setOpenPanel] = useState<FilesActionsPanel | null>(null);
  /** 文件名关键词；会话内状态，不持久化 */
  const [keyword, setKeyword] = useState('');

  // 页面标题栏的「刷新当前页面」：静默重读当前目录，失败由订阅方弹提示
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 当前目录作为收藏条目；还没选目录时为 null，收藏按钮禁用 */
  const currentEntry = listing ? { path: listing.path, name: listing.name } : null;

  /** 筛完的文件夹 / 应用 / 文件，以及表格要的合并行 */
  const {
    rows: tableRows,
    visibleApps,
    visibleFiles,
    visibleFolders,
  } = selectVisibleEntries(listing, selectedCategories, keyword);

  /** 切换某块弹层：再点一次同一块则收起 */
  const togglePanel = (panel: FilesActionsPanel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel));

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

  /** 骨架 / 空态 / 首次引导：判定收在纯函数里，页面只挑状态渲染 */
  const {
    showEmpty,
    showGridSkeleton,
    showPrompt,
    showSkeleton,
    showTableSkeleton,
  } = describeListState({
    currentDir,
    error,
    isGridView,
    listing,
    loading,
    visibleCount: visibleFolders.length + visibleApps.length + visibleFiles.length,
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
  const emptyText = showEmpty
    ? emptyListingText(selectedCategories, keyword)
    : null;

  return (
    <MenuContentLayout
      actions={
        <FilesActions
          canEject={volumeEject.canEject}
          createDisabled={currentEntry === null}
          ejecting={volumeEject.ejecting}
          favoriteDisabled={currentEntry === null}
          favorites={favorites}
          isFavorite={currentEntry !== null && isFavorite(currentEntry.path)}
          isGridView={isGridView}
          keyword={keyword}
          loading={loading}
          onCreateFolder={entryActions.createEntry}
          onEject={volumeEject.requestEject}
          onKeywordChange={setKeyword}
          onMoveFavorite={moveFavorite}
          onOpenFavorite={goToDir}
          onPanelChange={setOpenPanel}
          onPickDir={handlePickDir}
          onRemoveFavorite={removeFavorite}
          onSelectedCategoriesChange={changeSelectedCategories}
          onToggleFavorite={() => {
            if (currentEntry !== null) {
              toggleFavorite(currentEntry);
            }
          }}
          onTogglePinnedFavorite={togglePinnedFavorite}
          onToggleViewMode={toggleViewMode}
          onTypeFilterModeChange={changeFilterMode}
          openPanel={openPanel}
          picking={picking}
          selectedCategories={selectedCategories}
          settings={settings}
          typeFilterMode={settings.filterMode}
        />
      }
      description={describeDirSpace(listing?.space ?? null)}
      fill
      onNavigateParent={navigateParent}
      onToggleFavorites={() => togglePanel('favorites')}
      onToggleFilter={() => togglePanel('filter')}
      title="文件"
    >
      <Stack className={styles.shell} gap="sm">
        <DirBreadcrumb currentDir={currentDir} onNavigate={goToDir} />

        <FilesStates
          emptyText={emptyText}
          error={error}
          gridSkeleton={showGridSkeleton}
          onRetry={refresh}
          prompt={showPrompt}
          tableSkeleton={showTableSkeleton}
        />

        {/* 两种形态都自己滚：纵向滚动条浮在内容之上，右侧固定留出一段比
            常规内边距更宽的空白（滚动条 6px + 呼吸空间），别让滚动条贴住列表内容 */}
        {listing !== null && !showSkeleton && !showEmpty ? (
          <FilesEntries
            apps={visibleApps}
            dragSource={entryActions.dragSource}
            dropTarget={entryActions.dropTarget}
            files={visibleFiles}
            folders={visibleFolders}
            isGridView={isGridView}
            launchingApp={launchingPath}
            loading={loading}
            loadingFolder={openingFolder}
            onDragEnd={entryActions.endDrag}
            onDragLeaveFolder={entryActions.dragLeaveFolder}
            onDragOverFolder={entryActions.dragOverFolder}
            onDragStartEntry={entryActions.dragStartEntry}
            onDropFolder={entryActions.dropFolder}
            onEditEntry={entryActions.editEntry}
            onOpenApp={launchApp}
            onOpenExternalVideo={openVideoExternal}
            onOpenFolder={openFolder}
            onOpenImage={openImage}
            onOpenVideo={openVideo}
            onRequestDeleteEntry={requestDelete}
            onRequestUninstallApp={appUninstall.requestUninstall}
            rows={tableRows}
            veilOpacity={settings.veilOpacity}
            videoApp={settings.videoApp}
            videoOpenMode={settings.videoOpenMode}
            videoThumbStyle={settings.videoThumbStyle}
          />
        ) : null}
      </Stack>

      <FilesModals
        appUninstall={appUninstall}
        deleteState={{
          cancelDelete,
          confirmDelete,
          deleteLoading,
          deletingEntry,
        }}
        entryActions={entryActions}
        volumeEject={volumeEject}
      />

      <FilesPreviewLayers
        blocked={deletingEntry !== null}
        imageActiveId={previewImageId}
        imageDefaultFullscreen={settings.imageFullscreen}
        imageItems={imageItems}
        onCaptureVideo={captureFrame}
        onCloseImage={closeImage}
        onCloseVideo={closeVideo}
        onOpenExternal={openVideoExternal}
        onPickCaptureDir={pickCaptureDir}
        onRequestDelete={requestDelete}
        onSelectImage={selectImage}
        onSelectVideo={selectVideo}
        storageScope={FILES_STORAGE_SCOPE}
        videoActiveId={previewVideoId}
        videoDefaultFullscreen={settings.videoFullscreen}
        videoItems={videoItems}
      />
    </MenuContentLayout>
  );
};

export default Files;
