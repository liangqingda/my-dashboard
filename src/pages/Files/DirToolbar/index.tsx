/**
 * 目录工具栏：一行排布——左侧当前路径面包屑，竖向分割线后依次是「打开」访达图标按钮、
 * 收藏弹层按钮、类型筛选弹层按钮。两块弹层互斥，同时只开一块。
 */

import { useState } from 'react';
import { Divider, Group, UnstyledButton } from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconBrandFinder,
  IconChevronRight,
  IconFilter,
  IconHome,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import IconPopoverButton from '@/components/buttons/IconPopoverButton';

import { splitPathSegments } from '../utils/files';

import FavoritesPanel from './FavoritesPanel';
import TypeFilterPanel from './TypeFilterPanel';
import type { DirToolbarProps } from './types';

import styles from './index.scss';

/** 同时只开一块弹层：收藏面板 / 类型面板 */
type OpenPanel = 'favorites' | 'type';

/** 与同排图标同档的尺寸 / 线宽 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.9;

const DirToolbar = ({
  currentDir,
  favoriteDisabled,
  favorites,
  isFavorite,
  loading,
  onCategoriesChange,
  onNavigate,
  onOpenFavorite,
  onPickDir,
  onRemoveFavorite,
  onToggleFavorite,
  selectedCategories,
  typeOptions,
}: DirToolbarProps) => {
  const [openPanel, setOpenPanel] = useState<OpenPanel | null>(null);
  const pathSegments = splitPathSegments(currentDir);

  return (
    <Group align="center" className={styles.top} gap="sm" justify="space-between" wrap="nowrap">
      <Group className={styles.breadcrumb} gap={4} wrap="wrap">
        {pathSegments.length > 0 ? (
          <>
            <IconHome aria-hidden="true" className={styles.home} size={14} />
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;

              return (
                <span className={styles.segment} key={segment.path}>
                  <IconChevronRight
                    aria-hidden="true"
                    className={styles.separator}
                    size={13}
                  />
                  {isLast ? (
                    <span className={styles.current}>{segment.label}</span>
                  ) : (
                    <UnstyledButton
                      className={styles.link}
                      onClick={() => onNavigate(segment.path)}
                      type="button"
                    >
                      {segment.label}
                    </UnstyledButton>
                  )}
                </span>
              );
            })}
          </>
        ) : (
          <span className={styles.placeholder}>未选择目录</span>
        )}
      </Group>

      <Group className={styles.actions} gap="sm" wrap="nowrap">
        <Divider className={styles.divider} orientation="vertical" />

        <FreeIconAction
          disabled={loading}
          label="选择本地目录"
          onClick={onPickDir}
        >
          <IconBrandFinder size={ICON_SIZE} stroke={ICON_STROKE} />
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
          onChange={(opened) => setOpenPanel(opened ? 'favorites' : null)}
          opened={openPanel === 'favorites'}
        >
          <FavoritesPanel
            disabled={favoriteDisabled}
            favorites={favorites}
            isFavorite={isFavorite}
            onClose={() => setOpenPanel(null)}
            onOpen={onOpenFavorite}
            onRemove={onRemoveFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </IconPopoverButton>

        <IconPopoverButton
          active={selectedCategories.length > 0}
          icon={<IconFilter size={15} stroke={ICON_STROKE} />}
          label="按类型筛选"
          onChange={(opened) => setOpenPanel(opened ? 'type' : null)}
          opened={openPanel === 'type'}
        >
          <TypeFilterPanel
            onChange={onCategoriesChange}
            options={typeOptions}
            selected={selectedCategories}
          />
        </IconPopoverButton>
      </Group>
    </Group>
  );
};

export default DirToolbar;
