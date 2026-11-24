import { memo } from 'react';
import { Loader, UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import TileVeil from '../TileVeil';
import { DEFAULT_TILE_MEDIA_SIZE } from '../constants';
import { writeDragPayload } from '../utils/drag-image';

import type { FolderTileProps } from './types';

import styles from './index.scss';

/**
 * 文件夹图标的视图框：Tabler 原始 24×24 视图框里上下左都有大片空白（图形本身约 2–22 / 3–20），
 * 直接按原视图框画，图源盒子等高时图形会小一圈；这里裁到图形边界并留一点余量，让它在盒子高度内画满。
 */
const FOLDER_ICON_VIEWBOX = '1.8 2.8 20.4 17.4';

/** 计数位内容：取数期间换成进度，不显示条目数以免误导 */
const renderFolderMeta = (folder: FolderTileProps['folder'], loading: boolean) => {
  if (loading) {
    return (
      <>
        <Loader className={styles.spinner} size={10} />
        正在打开…
      </>
    );
  }

  return folder.itemCount > 0 ? `${folder.itemCount} 个项目` : '空文件夹';
};

/**
 * 网格里的一条子文件夹：蓝色文件夹图标居上，名称与直属条目数纵向排在图标下方并居中，
 * 点击进入下一层目录；hover 时盖上与文件瓦片同一份玻璃层，右上角浮出重命名 / 删除两个操作按钮。
 * 图标随瓦片宽度自适应，高度与缩略图对齐（样式里定比例），不比图片 / 视频的图源小一圈。
 * 同时可作为拖拽源，也可作为其它条目拖入的目标。
 * 点开后到新目录回来之前本条目不可再点，计数位置显示「正在打开…」；
 * 计数只数直属条目，不递归子文件夹（与中间件口径一致）；
 * 名称最多两行，超出做中间省略保留尾部，hover 时给全量。
 */
const FolderTile = memo(
  ({
    dropActive = false,
    dragging = false,
    folder,
    loading = false,
    onDragEnd,
    onDragLeave,
    onDragOver,
    onDrop,
    hideActions = false,
    onDragStartEntry,
    onEdit,
    onOpen,
    onRequestDelete,
    pending = false,
    tipOff = false,
    veilOpacity,
  }: FolderTileProps) => (
    <div
      className={cx(
        styles.wrapper,
        dragging && styles.dragging,
        dropActive && styles.dropActive,
        pending && styles.pending,
      )}
      data-entry-path={folder.path}
      draggable
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDragStart={(event) => {
        writeDragPayload(event.dataTransfer, [folder.path]);
        onDragStartEntry?.();
      }}
      onDrop={onDrop}
    >
      <TileVeil opacity={veilOpacity} />
      <UnstyledButton
        aria-label={`打开文件夹 ${folder.name}`}
        className={styles.tile}
        disabled={loading}
        onClick={() => onOpen(folder.path)}
        type="button"
      >
        <IconFolderFilled
          aria-hidden="true"
          className={styles.icon}
          size={DEFAULT_TILE_MEDIA_SIZE}
          stroke={1.2}
          viewBox={FOLDER_ICON_VIEWBOX}
        />
        <span className={styles.body}>
          <FreeTruncatedText
            className={styles.name}
            disabled={tipOff}
            ellipsis="middle"
            lines={2}
            position="top"
            text={folder.name}
          />
          <span className={styles.count}>
            {renderFolderMeta(folder, loading)}
          </span>
        </span>
      </UnstyledButton>

      {hideActions ? null : (
        <EntryTileActions
          className={styles.actions}
          kind="folder"
          onEdit={() => onEdit?.()}
          onRequestDelete={() => onRequestDelete?.()}
        />
      )}
    </div>
  ),
);

export default FolderTile;
