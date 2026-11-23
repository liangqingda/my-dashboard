/**
 * 收藏目录弹层面板：每条收藏都能点直达，右侧一颗固定图标（固定 / 未固定两种样式，
 * 只靠实心与描边区隔、不额外上色）与未固定条目的移除按钮；固定项排在最上面、不显示移除
 * 按钮，与下方未固定项之间用一条分割线隔开，其余条目可拖拽排序。
 * 「系统应用程序」只是首次预置的一条已固定收藏，取消固定 / 改名之外的编辑与其余条目一致。
 * 条目两行：目录名在上，完整路径在下；路径过长省略，hover 显示全文。
 * 列表数据、固定状态与排序持久化归 `useFavorites`，这里只排布与条目事件。
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import { Button, Divider, Stack, Text } from '@mantine/core';
import { IconPin, IconPinnedFilled, IconX } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import type { FavoriteEntry } from '../../types';

import type { FavoritesPanelProps } from './types';

import styles from './index.scss';

/** 拖拽源 / 悬停目标都只存路径：面板里的列表很短，不需要索引之外的拖拽模型 */
const FavoritesPanel = ({
  disabled,
  favorites,
  isFavorite,
  onClose,
  onMove,
  onOpen,
  onRemove,
  onToggleFavorite,
  onTogglePinned,
}: FavoritesPanelProps) => {
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [overPath, setOverPath] = useState<string | null>(null);

  /** 拖到某一行上：只接受条目之间的排序，不接外部文件 */
  const handleDragOver = (path: string) => (event: DragEvent<HTMLDivElement>) => {
    const { dataTransfer } = event;

    event.preventDefault();
    dataTransfer.dropEffect = 'move';
    setOverPath(path);
  };

  const endDrag = () => {
    setDragPath(null);
    setOverPath(null);
  };

  /** 一行的排布：拖拽态、直达、固定 / 移除按钮都在这里，固定组与未固定组共用 */
  const renderRow = (entry: FavoriteEntry) => (
    <div
      className={[
        styles.row,
        dragPath === entry.path ? styles.dragging : '',
        overPath === entry.path && dragPath !== entry.path
          ? styles.dropTarget
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      key={entry.path}
      onClick={() => {
        onOpen(entry.path);
        onClose();
      }}
      onDragEnd={endDrag}
      onDragOver={handleDragOver(entry.path)}
      onDragStart={(event) => {
        const { dataTransfer } = event;

        dataTransfer.effectAllowed = 'move';
        // 有的浏览器不给 setData 就不启动拖拽
        dataTransfer.setData('text/plain', entry.path);
        setDragPath(entry.path);
      }}
      onDrop={(event) => {
        event.preventDefault();

        if (dragPath !== null) {
          onMove(dragPath, entry.path);
        }

        endDrag();
      }}
    >
      <div className={styles.info}>
        <FreeTruncatedText className={styles.name} text={entry.name} />
        <FreeTruncatedText className={styles.path} text={entry.path} />
      </div>
      <FreeIconAction
        label={entry.pinned ? '取消固定' : '固定到顶部'}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePinned(entry.path);
        }}
        size="xs"
        tooltip="none"
      >
        {entry.pinned ? <IconPinnedFilled size={13} /> : <IconPin size={13} />}
      </FreeIconAction>
      {entry.pinned ? null : (
        <FreeIconAction
          label="移除收藏"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(entry.path);
          }}
          size="xs"
          tooltip="none"
        >
          <IconX size={13} />
        </FreeIconAction>
      )}
    </div>
  );

  const renderRows = (list: FavoriteEntry[]) => list.map(renderRow);

  /** 固定组在上、未固定组在下：两组之间由分割线断开，拖拽仍可在两组之间落点 */
  const pinnedFavorites = favorites.filter((entry) => entry.pinned);
  const restFavorites = favorites.filter((entry) => !entry.pinned);

  return (
    <Stack gap="sm">
      {favorites.length === 0 ? (
        <Text c="dimmed" size="xs">
          还没有收藏的目录
        </Text>
      ) : (
        <Stack gap={2}>
          {renderRows(pinnedFavorites)}
          {pinnedFavorites.length > 0 && restFavorites.length > 0 ? (
            <Divider my={2} size="xs" />
          ) : null}
          {renderRows(restFavorites)}
        </Stack>
      )}

      <Button
        disabled={disabled}
        fullWidth
        onClick={onToggleFavorite}
        size="sm"
        variant="default"
      >
        {isFavorite ? '取消收藏当前目录' : '收藏当前目录'}
      </Button>
    </Stack>
  );
};

export default FavoritesPanel;
