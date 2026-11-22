import {
  Button,
  Divider,
  Group,
  MultiSelect,
  Pill,
  Select,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconChevronRight,
  IconHome,
  IconX,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import {
  FAVORITE_SELECT_WIDTH,
  MAX_VISIBLE_CATEGORY_PILLS,
  TYPE_FILTER_WIDTH,
} from '../constants';
import { splitPathSegments } from '../utils/files';
import type { FileCategory } from '../types';

import type { DirToolbarProps } from './types';

import styles from './index.scss';

/**
 * 目录工具栏：上行是当前路径面包屑，右侧经竖向分割线接收藏开关与「打开」按钮；
 * 下行是类型多选与收藏目录下拉。
 */
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
  const segments = splitPathSegments(currentDir);

  const favoriteOptions = favorites.map((favorite) => ({
    value: favorite.path,
    label: favorite.name,
  }));
  const favoriteValue = favorites.some((item) => item.path === currentDir)
    ? currentDir
    : '';
  const categoryLabelByValue = new Map(
    typeOptions.map((option) => [option.value, option.label]),
  );

  return (
    <div className={styles.toolbar}>
      <Group className={styles.top} gap="sm" justify="space-between" wrap="nowrap">
        <Group className={styles.breadcrumb} gap={4} wrap="wrap">
          {segments.length > 0 ? (
            <>
              <IconHome aria-hidden="true" className={styles.home} size={14} />
              {segments.map((segment, index) => {
                const last = index === segments.length - 1;

                return (
                  <span className={styles.segment} key={segment.path}>
                    <IconChevronRight
                      aria-hidden="true"
                      className={styles.separator}
                      size={13}
                    />
                    {last ? (
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
            disabled={favoriteDisabled}
            label="收藏目录"
            onClick={onToggleFavorite}
            size="sm"
            tooltipLabel={isFavorite ? '取消收藏当前目录' : '收藏当前目录'}
          >
            {isFavorite ? (
              <IconBookmarkFilled size={16} />
            ) : (
              <IconBookmark size={16} />
            )}
          </FreeIconAction>
          <Button
            disabled={loading}
            onClick={onPickDir}
            size="xs"
            title="选择本地目录"
            variant="default"
          >
            打开
          </Button>
        </Group>
      </Group>

      <Group gap="sm" wrap="nowrap">
        <MultiSelect
          aria-label="按文件类型筛选"
          clearable
          data={typeOptions}
          onChange={onCategoriesChange}
          placeholder="全部类型"
          renderPill={({ option, onRemove, value }) => {
            const idx = selectedCategories.indexOf(value as FileCategory);

            if (idx < 0) {
              return null;
            }

            if (idx < MAX_VISIBLE_CATEGORY_PILLS) {
              return (
                <Pill onRemove={onRemove} size="xs" withRemoveButton>
                  {option.label}
                </Pill>
              );
            }

            if (idx !== MAX_VISIBLE_CATEGORY_PILLS) {
              return null;
            }

            const hidden = selectedCategories.slice(MAX_VISIBLE_CATEGORY_PILLS);
            const hiddenLabels = hidden.map(
              (item) => categoryLabelByValue.get(item) ?? item,
            );

            return (
              <Tooltip label={hiddenLabels.join('、')} multiline position="top">
                <Pill size="xs">+{hidden.length}</Pill>
              </Tooltip>
            );
          }}
          size="xs"
          styles={{ pillsList: { flexWrap: 'nowrap' } }}
          value={selectedCategories}
          w={TYPE_FILTER_WIDTH}
        />
        {favorites.length > 0 ? (
          <Select
            allowDeselect={false}
            aria-label="收藏的目录"
            data={favoriteOptions}
            onChange={(value) => {
              if (value !== null) {
                onOpenFavorite(value);
              }
            }}
            placeholder="收藏目录"
            renderOption={({ option }) => (
              <Group gap="xs" justify="space-between" wrap="nowrap">
                <FreeTruncatedText inline position="top" text={option.label} />
                <FreeIconAction
                  label="移除收藏"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveFavorite(option.value);
                  }}
                  size="xs"
                  tooltip="none"
                >
                  <IconX size={13} />
                </FreeIconAction>
              </Group>
            )}
            size="xs"
            value={favoriteValue}
            w={FAVORITE_SELECT_WIDTH}
          />
        ) : null}
      </Group>
    </div>
  );
};

export default DirToolbar;
