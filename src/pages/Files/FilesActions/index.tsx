/**
 * 文件页标题栏操作按钮组：「新建文件夹」「打开本地目录」图标按钮、收藏弹层按钮、筛选弹层按钮。
 * 两块弹层互斥，同时只开一块；开合状态由页面层持有，这里只排按钮与弹层内容。
 */

import {
  IconBookmark,
  IconBookmarkFilled,
  IconFilter,
  IconFolderOpen,
  IconFolderPlus,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';

import FavoritesPanel from './FavoritesPanel';
import TypeFilterPanel from './TypeFilterPanel';
import type { FilesActionsProps } from './types';

/** 与同排图标同档的尺寸 / 线宽 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const FilesActions = ({
  createDisabled,
  favoriteDisabled,
  favorites,
  isFavorite,
  keyword,
  loading,
  onCategoriesChange,
  onCreateFolder,
  onKeywordChange,
  onOpenFavorite,
  onPanelChange,
  onPickDir,
  onRemoveFavorite,
  onToggleFavorite,
  openPanel,
  selectedCategories,
  typeOptions,
}: FilesActionsProps) => {
  /** 筛选有没有条件生效：分类或关键词任一非空，图标用强调色 */
  const filterActive = selectedCategories.length > 0 || keyword.trim() !== '';

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
          keyword={keyword}
          onChange={onCategoriesChange}
          onKeywordChange={onKeywordChange}
          onReset={() => {
            onCategoriesChange([]);
            onKeywordChange('');
          }}
          options={typeOptions}
          selected={selectedCategories}
        />
      </IconPopoverButton>
    </>
  );
};

export default FilesActions;
