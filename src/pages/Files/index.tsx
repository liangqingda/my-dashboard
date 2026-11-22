import { useEffect, useState, type DragEvent } from 'react';
import {
  Alert,
  Button,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import MenuContentLayout from '@/layouts/MenuContentLayout';
import { getErrorMessage } from '@/utils/error';
import { onPageRefresh } from '@/utils/page-refresh';

import DirectoryGrid from './DirectoryGrid';
import DirBreadcrumb from './DirBreadcrumb';
import FilesActions from './FilesActions';
import type { FilesActionsPanel } from './FilesActions/types';
import { SKELETON_TILES } from './constants';
import { useFavorites } from './hooks/useFavorites';
import { useFilesDir } from './hooks/useFilesDir';
import { useTypeFilter } from './hooks/useTypeFilter';
import {
  availableCategoryOptions,
  filterFilesByCategory,
  filterFilesByKeyword,
} from './utils/files';
import { createFolder, moveEntry, renameEntry } from './utils/files-api';

import styles from './index.scss';

/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹与文件，不限文件类型。
 * 点文件夹进入下一层，面包屑回退，`⌘↑` 回上一级；可收藏常用目录，在收藏面板里点选直达；
 * 标题栏筛选面板支持按文件名关键词与类型多选过滤。文件内容与预览播放是单独任务，
 * 本页只列摘要。目录读取走 Vite 中间件，仅开发模式可用。
 */
const Files = () => {
  const { currentDir, listing, loading, error, openDir, pickDir, refresh, reload } =
    useFilesDir();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { selected: selectedCategories, onChange: onCategoriesChange } =
    useTypeFilter();

  /** 同时只开一块弹层：收藏 / 筛选 */
  const [openPanel, setOpenPanel] = useState<FilesActionsPanel | null>(null);
  /** 文件名关键词；会话内状态，不持久化 */
  const [keyword, setKeyword] = useState('');
  /** 正在就地改名的文件夹路径；null 表示没有改名态 */
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  /** 拖拽中的条目路径与悬停的放置目标文件夹路径 */
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

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

  /** 离开当前目录前清掉改名与拖拽临时状态，不沿用到新目录 */
  const resetTransientState = () => {
    setRenamingPath(null);
    setDragSource(null);
    setDropTarget(null);
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

  /** 新建文件夹：后端落一个默认名条目，刷新后进入就地改名态 */
  const handleCreateFolder = async () => {
    if (!listing) {
      return;
    }

    try {
      const created = await createFolder(listing.path);

      await reload();
      setRenamingPath(created.path);
    } catch (err) {
      notifications.show({
        title: '新建文件夹失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    }
  };

  /** 提交改名：成功后刷新列表；失败弹提示并退出改名态，条目保留原名 */
  const handleRenameCommit = async (path: string, name: string) => {
    try {
      await renameEntry(path, name);
      await reload();
    } catch (err) {
      notifications.show({
        title: '重命名失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setRenamingPath(null);
    }
  };

  /** 拖拽移动：同名冲突 / 移入自身后代由后端拒绝，失败不改动原位置 */
  const handleMove = async (source: string, targetDir: string) => {
    if (!source || source === targetDir) {
      setDragSource(null);
      setDropTarget(null);

      return;
    }

    try {
      await moveEntry(source, targetDir);
      await reload();
      notifications.show({
        title: '已移动',
        message: '条目已移入目标文件夹',
        color: 'teal',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        title: '移动失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setDragSource(null);
      setDropTarget(null);
    }
  };

  const handleDragOverFolder = (path: string, event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDropTarget(path);
  };

  const handleDropFolder = (path: string) => {
    if (dragSource) {
      void handleMove(dragSource, path);
    }
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
          onCreateFolder={handleCreateFolder}
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
              dragSource={dragSource}
              dropTarget={dropTarget}
              files={visibleFiles}
              folders={listing.folders}
              onDragEnd={() => {
                setDragSource(null);
                setDropTarget(null);
              }}
              onDragLeaveFolder={() => setDropTarget(null)}
              onDragOverFolder={handleDragOverFolder}
              onDragStartEntry={setDragSource}
              onDropFolder={handleDropFolder}
              onOpenFolder={goToDir}
              onRenameCancel={() => setRenamingPath(null)}
              onRenameCommit={handleRenameCommit}
              renamingPath={renamingPath}
            />
          </ScrollArea>
        ) : null}
      </Stack>
    </MenuContentLayout>
  );
};

export default Files;
