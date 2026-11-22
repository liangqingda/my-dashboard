import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconFolderFilled, IconPencil, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { FolderTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条子文件夹：蓝色文件夹图标居上，名称与直属条目数纵向排在图标下方并居中，
 * 点击进入下一层目录；hover 时右上角浮出重命名 / 删除两个操作按钮。
 * 同时可作为拖拽源，也可作为其它条目拖入的目标。
 * 计数只数直属条目，不递归子文件夹（与中间件口径一致）；
 * 名称最多两行，超出做中间省略保留尾部，hover 时给全量。
 */
const FolderTile = memo(
  ({
    dropActive = false,
    dragging = false,
    folder,
    onDragEnd,
    onDragLeave,
    onDragOver,
    onDrop,
    onDragStartEntry,
    onEdit,
    onOpen,
    onRequestDelete,
  }: FolderTileProps) => (
    <div
      className={cx(
        styles.wrapper,
        dragging && styles.dragging,
        dropActive && styles.dropActive,
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={(event) => {
        const { dataTransfer } = event;

        dataTransfer.effectAllowed = 'move';
        dataTransfer.setData('text/plain', folder.path);
        onDragStartEntry?.();
      }}
      onDrop={onDrop}
    >
      <UnstyledButton
        aria-label={`打开文件夹 ${folder.name}`}
        className={styles.tile}
        onClick={() => onOpen(folder.path)}
        type="button"
      >
        <IconFolderFilled
          aria-hidden="true"
          className={styles.icon}
          size={48}
          stroke={1.2}
        />
        <span className={styles.body}>
          <FreeTruncatedText
            className={styles.name}
            ellipsis="middle"
            lines={2}
            position="top"
            text={folder.name}
          />
          <span className={styles.count}>
            {folder.itemCount > 0 ? `${folder.itemCount} 个项目` : '空文件夹'}
          </span>
        </span>
      </UnstyledButton>

      <div className={styles.actions}>
        <FreeIconAction
          label="重命名文件夹"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.();
          }}
          size="xs"
        >
          <IconPencil size={13} />
        </FreeIconAction>
        <FreeIconAction
          label="删除文件夹"
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete?.();
          }}
          size="xs"
          tone="danger"
        >
          <IconTrash size={13} />
        </FreeIconAction>
      </div>
    </div>
  ),
);

export default FolderTile;
