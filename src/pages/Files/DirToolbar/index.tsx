import { useState } from 'react';
import {
  Button,
  Group,
  MultiSelect,
  Select,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconChevronRight,
  IconFolderOpen,
  IconHome,
  IconX,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeInput from '@/components/fields/FreeInput';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import {
  DIR_INPUT_PLACEHOLDER,
  DIR_INPUT_WIDTH,
  FAVORITE_SELECT_WIDTH,
  TYPE_FILTER_WIDTH,
} from '../constants';
import { splitPathSegments } from '../utils/files';

import type { DirToolbarProps } from './types';

import styles from './index.scss';

/**
 * 目录工具栏：上行是当前路径面包屑（点某一段回到那一层），下行从左到右是类型多选、
 * 收藏目录下拉、路径输入框、收藏开关与「打开」按钮。输入框草稿由工具栏自己持有；
 * 外部切目录（面包屑 / 打开成功）时按渲染期校准回显。
 */
const DirToolbar = ({
  currentDir,
  favoriteDisabled,
  favorites,
  isFavorite,
  loading,
  onCategoriesChange,
  onNavigate,
  onOpenDir,
  onOpenFavorite,
  onPickDir,
  onRemoveFavorite,
  onToggleFavorite,
  selectedCategories,
  typeOptions,
}: DirToolbarProps) => {
  const [draft, setDraft] = useState(currentDir);
  const [syncedDir, setSyncedDir] = useState(currentDir);

  /*
   * 外部路径变化（面包屑回退、打开新目录）后，输入框跟着回显当前目录：
   * 渲染期校准状态，不用 effect 再跑一轮 setState
   */
  if (currentDir !== syncedDir) {
    setSyncedDir(currentDir);
    setDraft(currentDir);
  }

  const segments = splitPathSegments(currentDir);

  const submit = () => {
    onOpenDir(draft);
  };

  const favoriteOptions = favorites.map((favorite) => ({
    value: favorite.path,
    label: favorite.name,
  }));
  const favoriteValue = favorites.some((item) => item.path === currentDir)
    ? currentDir
    : '';

  return (
    <div className={styles.toolbar}>
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

      <Group gap="sm" wrap="nowrap">
        <MultiSelect
          aria-label="按文件类型筛选"
          clearable
          data={typeOptions}
          onChange={onCategoriesChange}
          placeholder="全部类型"
          size="xs"
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
        <FreeInput
          ariaLabel="本地目录路径"
          leftSection={<IconFolderOpen size={15} stroke={1.9} />}
          onChange={setDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submit();
            }
          }}
          placeholder={DIR_INPUT_PLACEHOLDER}
          value={draft}
          width={DIR_INPUT_WIDTH}
        />
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
          variant="subtle"
        >
          打开
        </Button>
      </Group>
    </div>
  );
};

export default DirToolbar;
