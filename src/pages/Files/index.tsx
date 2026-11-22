import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';

import MenuContentLayout from '@/layouts/MenuContentLayout';
import { onPageRefresh } from '@/utils/page-refresh';

import DirectoryGrid from './DirectoryGrid';
import DeleteEntryConfirm from './DeleteEntryConfirm';
import DirBreadcrumb from './DirBreadcrumb';
import FilesActions from './FilesActions';
import type { FilesActionsPanel } from './FilesActions/types';
import RenameEntryModal from './RenameEntryModal';
import { SKELETON_TILES } from './constants';
import { useEntryActions } from './hooks/useEntryActions';
import { useEntryDelete } from './hooks/useEntryDelete';
import { useFavorites } from './hooks/useFavorites';
import { useFilesDir } from './hooks/useFilesDir';
import { useTypeFilter } from './hooks/useTypeFilter';
import {
  availableCategoryOptions,
  describeDirSpace,
  filterFilesByCategory,
  filterFilesByKeyword,
} from './utils/files';

import styles from './index.scss';

/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹与文件，不限文件类型。
 * 点文件夹进入下一层，面包屑回退，`⌘↑` 回上一级；可收藏常用目录，在收藏面板里点选直达；
 * 标题栏筛选面板支持按文件名关键词与类型多选过滤。文件内容与预览播放是单独任务，
 * 本页只列摘要。目录读取走 Vite 中间件，仅开发模式可用。
 * 标题行右侧再显示本机剩余可用空间；当前目录在外接盘（移动硬盘）上时，连同那块盘的可用空间一起显示。
 */
const Files = () => {
  const { currentDir, listing, loading, error, openDir, pickDir, refresh, reload } =
    useFilesDir();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { selected: selectedCategories, onChange: onCategoriesChange } =
    useTypeFilter();

  const folders = listing?.folders ?? [];
  const allFiles = listing?.files ?? [];
  const entryActions = useEntryActions(listing?.path ?? null, reload);
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

  /** 类型 + 关键词筛选后的文件；文件夹不受筛选影响 */
  const visibleFiles = listing
    ? filterFilesByKeyword(
        filterFilesByCategory(listing.files, selectedCategories),
        keyword,
      )
    : [];
  /** 当前目录里实际出现过的分类，作为筛选项 */
  const typeOptions = listing ? availableCategoryOptions(listing.files) : [];

  /** 切换某块弹层：再点一次同一块则收起 */
  const togglePanel = (panel: FilesActionsPanel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel));

  /** 离开当前目录前清掉改名、拖拽与待删除临时状态，不沿用到新目录 */
  const resetTransientState = () => {
    entryActions.resetTransient();
    resetDelete();
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

  /** 首次 / 切目录还没拿到结果：先给骨架形状，不报 0 */
  const showSkeleton = loading && listing === null;
  /** 拿到结果但筛完既没有文件夹也没有文件 */
  const showEmpty =
    !showSkeleton &&
    listing !== null &&
    listing.folders.length === 0 &&
    visibleFiles.length === 0;
  /** 还没选过目录：引导先填路径，不报错 */
  const showPrompt = !showSkeleton && listing === null && error === null;

  return (
    <MenuContentLayout
      actions={
        <FilesActions
          createDisabled={currentEntry === null}
          favoriteDisabled={currentEntry === null}
          favorites={favorites}
          isFavorite={currentEntry !== null && isFavorite(currentEntry.path)}
          keyword={keyword}
          loading={loading}
          onCategoriesChange={onCategoriesChange}
          onCreateFolder={entryActions.createEntry}
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
          openPanel={openPanel}
          selectedCategories={selectedCategories}
          typeOptions={typeOptions}
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

        {showSkeleton ? (
          <div className={styles.gridSkeleton}>
            {SKELETON_TILES.map((tile) => (
              <Skeleton height={112} key={tile} />
            ))}
          </div>
        ) : null}

        {showPrompt ? (
          <Text className={styles.empty} size="sm">
            点「打开」选择要浏览的本地目录，或从收藏目录进入
          </Text>
        ) : null}

        {showEmpty ? (
          <Text className={styles.empty} size="sm">
            这个目录里没有文件或子文件夹
          </Text>
        ) : null}

        {listing !== null && !showEmpty ? (
          <ScrollArea
            className={styles.list}
            offsetScrollbars="y"
            scrollbarSize={6}
            scrollbars="y"
            styles={{
              viewport: { paddingBottom: 12, paddingInlineStart: 12, paddingTop: 12 },
            }}
            type="auto"
          >
            <DirectoryGrid
              dragSource={entryActions.dragSource}
              dropTarget={entryActions.dropTarget}
              files={visibleFiles}
              folders={folders}
              onDragEnd={entryActions.clearDrag}
              onDragLeaveFolder={entryActions.dragLeaveFolder}
              onDragOverFolder={entryActions.dragOverFolder}
              onDragStartEntry={entryActions.dragStartEntry}
              onDropFolder={entryActions.dropFolder}
              onEditEntry={entryActions.editEntry}
              onOpenFolder={goToDir}
              onRequestDeleteEntry={requestDelete}
            />
          </ScrollArea>
        ) : null}
      </Stack>

      <DeleteEntryConfirm
        entry={deletingEntry}
        loading={deleteLoading}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
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
