/**
 * 文件页标题栏操作按钮组：「新建文件夹」「打开本地目录」图标按钮、收藏 / 筛选 / 设置弹层按钮、
 * 网格 / 表格切换按钮。三块弹层互斥，同时只开一块；开合状态由页面层持有，这里只排按钮与弹层内容。
 */

import { useEffect } from 'react';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconPlayerEject,
  IconFilter,
  IconFolderOpen,
  IconFolderPlus,
  IconLayoutGrid,
  IconLayoutList,
  IconSettings,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';

import { resetVideoAppsCache } from '../utils/video-api';
import { FILE_CATEGORY_VALUES } from '../constants';
import { isTypeFilterAllSelected } from '../utils/files';

import FavoritesPanel from './FavoritesPanel';
import SettingsPanel from './SettingsPanel';
import TypeFilterPanel from './TypeFilterPanel';
import type { FilesActionsProps } from './types';

/** 与同排图标同档的尺寸 / 线宽 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const FilesActions = ({
  canEject,
  createDisabled,
  ejecting,
  onEject,
  selectedCategories,
  typeFilterMode,
  favoriteDisabled,
  favorites,
  isFavorite,
  isGridView,
  keyword,
  loading,
  onSelectedCategoriesChange,
  onTypeFilterModeChange,
  onCreateFolder,
  onKeywordChange,
  onMoveFavorite,
  onOpenFavorite,
  onPanelChange,
  onPickDir,
  picking,
  onRemoveFavorite,
  onToggleFavorite,
  onTogglePinnedFavorite,
  onToggleViewMode,
  openPanel,
  settings,
}: FilesActionsProps) => {
  /** 进页面即清掉播放器列表的缓存：本次停留内设置面板开关共用一份，下次进页面重扫 */
  useEffect(() => {
    resetVideoAppsCache();
  }, []);

  /** 筛选有没有条件生效：排除项或关键词任一非空，图标用强调色 */
  const filterActive =
    !isTypeFilterAllSelected(selectedCategories) || keyword.trim() !== '';

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
        disabled={loading || picking}
        label={picking ? '正在打开目录选择框' : '选择本地目录'}
        loading={picking}
        onClick={onPickDir}
      >
        <IconFolderOpen size={ICON_SIZE} stroke={ICON_STROKE} />
      </FreeIconAction>

      {canEject ? (
        <FreeIconAction
          disabled={loading || ejecting}
          label={ejecting ? '正在推出外接盘' : '推出外接盘'}
          loading={ejecting}
          onClick={onEject}
        >
          <IconPlayerEject size={ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

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
          onMove={onMoveFavorite}
          onOpen={onOpenFavorite}
          onRemove={onRemoveFavorite}
          onToggleFavorite={onToggleFavorite}
          onTogglePinned={onTogglePinnedFavorite}
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
          keyword={keyword}
          mode={typeFilterMode}
          onChange={onSelectedCategoriesChange}
          onKeywordChange={onKeywordChange}
          onReset={() => {
            onSelectedCategoriesChange([...FILE_CATEGORY_VALUES]);
            onKeywordChange('');
          }}
          selected={selectedCategories}
        />
      </IconPopoverButton>

      <IconPopoverButton
        active={settings.videoOpenMode === 'external'}
        icon={<IconSettings size={ICON_SIZE} stroke={ICON_STROKE} />}
        label="设置"
        onChange={(opened) => onPanelChange(opened ? 'settings' : null)}
        opened={openPanel === 'settings'}
        width="min(380px, calc(100vw - 24px))"
      >
        <SettingsPanel
          filterMode={typeFilterMode}
          imageFullscreen={settings.imageFullscreen}
          nameSize={settings.nameSize}
          onFilterModeChange={onTypeFilterModeChange}
          onImageFullscreenChange={settings.setImageFullscreen}
          onNameSizeChange={settings.setNameSize}
          onTileSizeChange={settings.setTileSize}
          onVeilOpacityChange={settings.setVeilOpacity}
          onVideoAppChange={settings.setVideoApp}
          onVideoFullscreenChange={settings.setVideoFullscreen}
          onVideoOpenModeChange={settings.setVideoOpenMode}
          onVideoThumbStyleChange={settings.setVideoThumbStyle}
          tileSize={settings.tileSize}
          veilOpacity={settings.veilOpacity}
          videoApp={settings.videoApp}
          videoFullscreen={settings.videoFullscreen}
          videoOpenMode={settings.videoOpenMode}
          videoThumbStyle={settings.videoThumbStyle}
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
