import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Group, Skeleton, Stack, Text } from '@mantine/core';

import VideoPreviewModal from '@/components/modals/VideoPreviewModal';
import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

import DeleteEntryConfirm from './DeleteEntryConfirm';
import DirBreadcrumb from './DirBreadcrumb';
import FilesActions from './FilesActions';
import type { FilesActionsPanel } from './FilesActions/types';
import FilesEntries from './FilesEntries';
import RenameEntryModal from './RenameEntryModal';
import UninstallAppConfirm from './UninstallAppConfirm';
import { FILES_STORAGE_SCOPE, SKELETON_TILES } from './constants';
import { useAppUninstall } from './hooks/useAppUninstall';
import { useEntryActions } from './hooks/useEntryActions';
import { useEntryDelete } from './hooks/useEntryDelete';
import { useFavorites } from './hooks/useFavorites';
import { useFilesDir } from './hooks/useFilesDir';
import { useFilesViewMode } from './hooks/useFilesViewMode';
import { useTypeFilter } from './hooks/useTypeFilter';
import { useVideoPreview } from './hooks/useVideoPreview';
import { videoContentUrl } from './utils/files-api';
import {
  describeDirSpace,
  filterAppsByCategory,
  filterAppsByKeyword,
  filterFilesByCategory,
  filterFilesByKeyword,
  filterFoldersByCategory,
  toFilesRows,
} from './utils/files';

import styles from './index.scss';

/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹、应用包与文件，不限文件类型；
 * 应用包按一条应用展示（真实图标 + 卸载入口），不当作可进入的文件夹。
 * 标题栏的图标按钮可在网格与表格（名称 / 类别 / 操作三列）两种展示形式之间切换，
 * 切换结果记在 localStorage，刷新后保持上次的形态。
 * 点文件夹进入下一层，面包屑回退，`⌘↑` 回上一级；可收藏常用目录，在收藏面板里点选直达；
 * 标题栏筛选面板支持按名称关键词过滤与按类型勾选：视频 / PDF / Markdown / App / 其它默认全选，
 * 取消勾选的类型连同对应文件夹一起隐藏。列表只列摘要；点视频条目会在弹窗里播放，
 * 弹窗的翻篇、目录侧栏与截图都基于当前目录的视频列表。应用 hover 后右上角给卸载按钮，
 * 二次确认里先列清要删的残留，确认后由中间件删整包并清理缓存 / 配置 / 数据。
 * 目录读取走 Vite 中间件，仅开发模式可用。
 * 标题行右侧再显示本机剩余可用空间；当前目录在外接盘（移动硬盘）上时，连同那块盘的可用空间一起显示。
 */
const Files = () => {
  const { currentDir, listing, loading, error, openDir, pickDir, refresh, reload } =
    useFilesDir();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { excluded, onChange: onExcludedChange } = useTypeFilter();
  /** 展示形式：网格 / 表格，切换按钮在标题栏 */
  const { isGridView, toggle: toggleViewMode } = useFilesViewMode();

  const folders = listing?.folders ?? [];
  const allFiles = listing?.files ?? [];
  const entryActions = useEntryActions(listing?.path ?? null, reload);
  /** 应用卸载：点卸载先取残留清单，确认后删整包并清理残留 */
  const appUninstall = useAppUninstall(reload);
  /** 视频预览：点视频打开弹窗，翻篇 / 侧栏 / 截图都按当前目录的视频列表走 */
  const {
    activeId: previewVideoId,
    captureFrame,
    closeVideo,
    openVideo,
    pickCaptureDir,
    selectVideo,
    videos: videoFiles,
  } = useVideoPreview(listing);
  /** 弹窗条目：id 用路径，播放地址由中间件按 Range 流式读 */
  const videoItems = useMemo(
    () =>
      videoFiles.map((file) => ({
        id: file.path,
        name: file.name,
        src: videoContentUrl(file.path),
      })),
    [videoFiles],
  );
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

  /** 类型 + 关键词筛选后的文件；文件夹不受关键词影响，按内含类型过滤 */
  const visibleFiles = listing
    ? filterFilesByKeyword(
        filterFilesByCategory(listing.files, excluded),
        keyword,
      )
    : [];
  /** 类型 + 关键词筛选后的应用；只有「App」这一档管它 */
  const visibleApps = listing
    ? filterAppsByKeyword(filterAppsByCategory(listing.apps, excluded), keyword)
    : [];
  /** 类型筛选后的文件夹：只剩仍有未排除类型的文件夹 */
  const visibleFolders = listing
    ? filterFoldersByCategory(listing.folders, excluded)
    : [];
  /** 表格视图的行：文件夹在前、应用其次、文件在后，与网格同一顺序 */
  const tableRows = toFilesRows(visibleFolders, visibleApps, visibleFiles);

  /** 切换某块弹层：再点一次同一块则收起 */
  const togglePanel = (panel: FilesActionsPanel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel));

  /** 离开当前目录前清掉改名、拖拽、待删除、待卸载与视频预览状态，不沿用到新目录 */
  const resetTransientState = () => {
    entryActions.resetTransient();
    resetDelete();
    appUninstall.reset();
    closeVideo();
  };

  /** 切目录：先清临时状态再交 hook 取数 */
  const goToDir = (dir: string) => {
    resetTransientState();
    openDir(dir);
  };

  /** 已是文件系统根时没有上级目录，快捷键不动作 */
  const parentDir = listing?.parent ?? null;
  const navigateParent =
    parentDir !== null ? () => goToDir(parentDir) : undefined;

  const handlePickDir = () => {
    resetTransientState();
    pickDir();
  };

  /** 首次 / 切目录还没拿到结果：先给骨架形状，不报 0；骨架跟着当前展示形式走 */
  const showSkeleton = loading && listing === null;
  const showGridSkeleton = showSkeleton && isGridView;
  const showTableSkeleton = showSkeleton && !isGridView;
  /** 拿到结果但筛完既没有文件夹、也没有应用与文件 */
  const showEmpty =
    !showSkeleton &&
    listing !== null &&
    visibleFolders.length === 0 &&
    visibleApps.length === 0 &&
    visibleFiles.length === 0;
  /** 还没选过目录：引导先填路径，不报错 */
  const showPrompt = !showSkeleton && listing === null && error === null;

  return (
    <MenuContentLayout
      actions={
        <FilesActions
          createDisabled={currentEntry === null}
          excludedCategories={excluded}
          favoriteDisabled={currentEntry === null}
          favorites={favorites}
          isFavorite={currentEntry !== null && isFavorite(currentEntry.path)}
          isGridView={isGridView}
          keyword={keyword}
          loading={loading}
          onCreateFolder={entryActions.createEntry}
          onExcludedChange={onExcludedChange}
          onKeywordChange={setKeyword}
          onOpenFavorite={goToDir}
          onPanelChange={setOpenPanel}
          onPickDir={handlePickDir}
          onRemoveFavorite={removeFavorite}
          onToggleFavorite={() => {
            if (currentEntry !== null) {
              toggleFavorite(currentEntry);
            }
          }}
          onToggleViewMode={toggleViewMode}
          openPanel={openPanel}
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

        {error !== null ? (
          <Alert color="red" title="读取目录失败">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Text size="xs">{error}</Text>
              <Button onClick={refresh} size="xs" variant="light">
                重试
              </Button>
            </Group>
          </Alert>
        ) : null}

        {showGridSkeleton ? (
          <div className={styles.gridSkeleton}>
            {SKELETON_TILES.map((tile) => (
              <Skeleton height={112} key={tile} />
            ))}
          </div>
        ) : null}

        {showTableSkeleton ? <Skeleton height={220} /> : null}

        {showPrompt ? (
          <Text className={styles.empty} size="sm">
            点「打开」选择要浏览的本地目录，或从收藏目录进入
          </Text>
        ) : null}

        {showEmpty ? (
          <Text className={styles.empty} size="sm">
            {excluded.length > 0 || keyword.trim() !== ''
              ? '没有符合筛选条件的条目'
              : '这个目录里没有文件或子文件夹'}
          </Text>
        ) : null}

        {/* 两种形态都自己滚：纵向滚动条浮在内容之上，右侧固定留出一段比
            常规内边距更宽的空白（滚动条 6px + 呼吸空间），别让滚动条贴住列表内容 */}
        {listing !== null && !showEmpty ? (
          <FilesEntries
            apps={visibleApps}
            dragSource={entryActions.dragSource}
            dropTarget={entryActions.dropTarget}
            files={visibleFiles}
            folders={visibleFolders}
            isGridView={isGridView}
            onDragEnd={entryActions.clearDrag}
            onDragLeaveFolder={entryActions.dragLeaveFolder}
            onDragOverFolder={entryActions.dragOverFolder}
            onDragStartEntry={entryActions.dragStartEntry}
            onDropFolder={entryActions.dropFolder}
            onEditEntry={entryActions.editEntry}
            onOpenFolder={goToDir}
            onOpenVideo={openVideo}
            onRequestDeleteEntry={requestDelete}
            onRequestUninstallApp={appUninstall.requestUninstall}
            rows={tableRows}
          />
        ) : null}
      </Stack>

      <DeleteEntryConfirm
        entry={deletingEntry}
        loading={deleteLoading}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />

      <UninstallAppConfirm
        app={appUninstall.app}
        loadingReport={appUninstall.loadingReport}
        onCancel={appUninstall.cancel}
        onConfirm={() => void appUninstall.confirm()}
        report={appUninstall.report}
        reportError={appUninstall.reportError}
        uninstalling={appUninstall.uninstalling}
      />

      <VideoPreviewModal
        activeId={previewVideoId}
        blocked={deletingEntry !== null}
        items={videoItems}
        onCapture={captureFrame}
        onClose={closeVideo}
        onPickCaptureDir={pickCaptureDir}
        onRequestDelete={
          previewVideoId !== null
            ? () => requestDelete(previewVideoId)
            : null
        }
        onSelect={selectVideo}
        opened={previewVideoId !== null}
        storageScope={FILES_STORAGE_SCOPE}
      />

      <RenameEntryModal
        entry={entryActions.renamingEntry}
        key={entryActions.renamingEntry?.path ?? 'none'}
        loading={entryActions.renameLoading}
        onCancel={entryActions.closeRename}
        onCommit={(name) => {
          if (entryActions.renamingEntry !== null) {
            void entryActions.renameCommit(entryActions.renamingEntry.path, name);
          }
        }}
      />
    </MenuContentLayout>
  );
};

export default Files;
