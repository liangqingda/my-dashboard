/**
 * 文件页标题栏操作按钮组：「新建文件夹」「打开本地目录」图标按钮、收藏 / 筛选 / 设置弹层按钮、
 * 网格 / 表格切换按钮。三块弹层互斥，同时只开一块；开合状态由页面层持有，这里只排按钮与弹层内容。
 */

import {
  IconBookmark,
  IconBookmarkFilled,
  IconFilter,
  IconFolderOpen,
  IconFolderPlus,
  IconLayoutGrid,
  IconLayoutList,
  IconSettings,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';

import FavoritesPanel from './FavoritesPanel';
import SettingsPanel from './SettingsPanel';
import TypeFilterPanel from './TypeFilterPanel';
import type { FilesActionsProps } from './types';

/** 与同排图标同档的尺寸 / 线宽 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const FilesActions = ({
  createDisabled,
  onVideoAppChange,
  onVideoOpenModeChange,
  videoApp,
  videoOpenMode,
  excludedCategories,
  favoriteDisabled,
  favorites,
  isFavorite,
  isGridView,
  keyword,
  loading,
  onExcludedChange,
  onCreateFolder,
  onKeywordChange,
  onOpenFavorite,
  onPanelChange,
  onPickDir,
  onRemoveFavorite,
  onToggleFavorite,
  onToggleViewMode,
  openPanel,
}: FilesActionsProps) => {
  /** 筛选有没有条件生效：排除项或关键词任一非空，图标用强调色 */
  const filterActive = excludedCategories.length > 0 || keyword.trim() !== '';

  return (
    <>
      <FreeIconAction
        disabled={createDisabled || loading}
        label="新建文件夹"
        onClick={onCreateFolder}
      >
        <IconFolderPlus size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>

      <FreeIconAction
        disabled={loading}
        label="选择本地目录"
        onClick={onPickDir}
      >
        <IconFolderOpen size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>

      <IconPopoverButton
        active={isFavorite}
        disabled={favoriteDisabled}
        hint={isFavorite ? '取消收藏当前目录' : '收藏当前目录'}
        icon={
          isFavorite ? (
            <IconBookmarkFilled size={ICON_SIZE} stroke={ICON_STROKE} />
          ) : (
            <IconBookmark size={ICON_SIZE} stroke={ICON_STROKE} />
          )
        }
        label="收藏目录"
        onChange={(opened) => onPanelChange(opened ? 'favorites' : null)}
        opened={openPanel === 'favorites'}
        shortcut="C"
      >
        <FavoritesPanel
          disabled={favoriteDisabled}
          favorites={favorites}
          isFavorite={isFavorite}
          onClose={() => onPanelChange(null)}
          onOpen={onOpenFavorite}
          onRemove={onRemoveFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      </IconPopoverButton>

      <IconPopoverButton
        active={filterActive}
        icon={<IconFilter size={15} stroke={ICON_STROKE} />}
        label="筛选"
        onChange={(opened) => onPanelChange(opened ? 'filter' : null)}
        opened={openPanel === 'filter'}
        shortcut="S"
      >
        <TypeFilterPanel
          excluded={excludedCategories}
          keyword={keyword}
          onChange={onExcludedChange}
          onKeywordChange={onKeywordChange}
          onReset={() => {
            onExcludedChange([]);
            onKeywordChange('');
          }}
        />
      </IconPopoverButton>

      <IconPopoverButton
        active={videoOpenMode === 'external'}
        icon={<IconSettings size={ICON_SIZE} stroke={ICON_STROKE} />}
        label="设置"
        onChange={(opened) => onPanelChange(opened ? 'settings' : null)}
        opened={openPanel === 'settings'}
      >
        <SettingsPanel
          onVideoAppChange={onVideoAppChange}
          onVideoOpenModeChange={onVideoOpenModeChange}
          videoApp={videoApp}
          videoOpenMode={videoOpenMode}
        />
      </IconPopoverButton>

      <FreeIconAction
        label={isGridView ? '切换为表格形式' : '切换为网格形式'}
        onClick={onToggleViewMode}
      >
        {isGridView ? (
          <IconLayoutGrid size={ICON_SIZE} stroke={ICON_STROKE} />
        ) : (
          <IconLayoutList size={ICON_SIZE} stroke={ICON_STROKE} />
        )}
      </FreeIconAction>
    </>
  );
};

export default FilesActions;
