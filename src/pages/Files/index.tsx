import { useEffect } from 'react';
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

import DirToolbar from './DirToolbar';
import DirectoryGrid from './DirectoryGrid';
import { SKELETON_TILES } from './constants';
import { useFavorites } from './hooks/useFavorites';
import { useFilesDir } from './hooks/useFilesDir';
import { useTypeFilter } from './hooks/useTypeFilter';
import { availableCategoryOptions, filterFilesByCategory } from './utils/files';

import styles from './index.scss';

/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹与文件，不限文件类型。
 * 点文件夹进入下一层，面包屑回退；可收藏常用目录，在下拉里点选直达；工具栏可按类型多选过滤。
 * 文件内容与预览播放是单独任务，本页只列摘要。目录读取走 Vite 中间件，仅开发模式可用。
 */
const Files = () => {
  const { currentDir, listing, loading, error, openDir, pickDir, refresh, reload } =
    useFilesDir();
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { selected: selectedCategories, onChange: onCategoriesChange } =
    useTypeFilter();

  // 页面标题栏的「刷新当前页面」：静默重读当前目录，失败由订阅方弹提示
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 当前目录作为收藏条目；还没选目录时为 null，收藏按钮禁用 */
  const currentEntry = listing ? { path: listing.path, name: listing.name } : null;

  /** 类型筛选后的文件；文件夹不受类型筛选影响 */
  const visibleFiles = listing
    ? filterFilesByCategory(listing.files, selectedCategories)
    : [];
  /** 当前目录里实际出现过的分类，作为类型下拉的可选项 */
  const typeOptions = listing ? availableCategoryOptions(listing.files) : [];

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
    <MenuContentLayout fill title="文件">
      <Stack className={styles.shell} gap="sm">
        <DirToolbar
          currentDir={currentDir}
          favoriteDisabled={currentEntry === null}
          favorites={favorites}
          isFavorite={currentEntry !== null && isFavorite(currentEntry.path)}
          loading={loading}
          onCategoriesChange={onCategoriesChange}
          onNavigate={openDir}
          onOpenDir={openDir}
          onOpenFavorite={openDir}
          onPickDir={pickDir}
          onRemoveFavorite={removeFavorite}
          onToggleFavorite={() => {
            if (currentEntry !== null) {
              toggleFavorite(currentEntry);
            }
          }}
          selectedCategories={selectedCategories}
          typeOptions={typeOptions}
        />

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
            输入本地目录的绝对路径后回车；留空则浏览主目录
          </Text>
        ) : null}

        {showEmpty ? (
          <Text className={styles.empty} size="sm">
            这个目录里没有文件或子文件夹
          </Text>
        ) : null}

        {listing !== null && !showEmpty ? (
          <ScrollArea className={styles.list} scrollbars="y" type="auto">
            <DirectoryGrid
              files={visibleFiles}
              folders={listing.folders}
              onOpenFolder={openDir}
            />
          </ScrollArea>
        ) : null}
      </Stack>
    </MenuContentLayout>
  );
};

export default Files;
