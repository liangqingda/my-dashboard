import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS, FILE_CATEGORY_LABELS } from '../constants';
import { formatFileSize } from '../utils/files';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FileTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条文件：图标居上居中，文件名与体积纵向排在下方并居中，可被拖拽移动。
 * 图标按文件归类区分；hover 时右上角浮出重命名 / 删除按钮。
 * 视频 / 图片（调用方传了 `onOpen`）整块可点，交给对应的预览弹窗；其它文件仍只是展示。
 * 名称最多两行，超出做中间省略保留尾部，hover 时给全量。
 * 指针停到视频瓦片上时先悄悄预取文件头，点开时首帧不必再等一次往返。
 */
const FileTile = memo(
  ({
    dragging = false,
    file,
    onDragEnd,
    onDragStartEntry,
    onEdit,
    onOpen,
    onRequestDelete,
  }: FileTileProps) => {
    const Icon = CATEGORY_ICONS[file.category];
    /** 媒体（视频 / 图片）图标单独上蓝，和文档类区分开 */
    const isMedia = file.category === 'video' || file.category === 'image';

    const content = (
      <>
        <Icon
          aria-hidden="true"
          className={cx(styles.icon, isMedia && styles.iconMedia)}
          size={48}
          stroke={1.2}
        />
        <span className={styles.body}>
          <FreeTruncatedText
            className={styles.name}
            ellipsis="middle"
            lines={2}
            position="top"
            text={file.name}
          />
          <span className={styles.meta}>{formatFileSize(file.size)}</span>
        </span>
      </>
    );

    return (
      <div
        className={cx(styles.wrapper, dragging && styles.dragging)}
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          const { dataTransfer } = event;

          dataTransfer.effectAllowed = 'move';
          dataTransfer.setData('text/plain', file.path);
          onDragStartEntry?.();
        }}
        onMouseEnter={() => {
          if (file.category === 'video') {
            prefetchVideoHead(file.path);
          }
        }}
      >
        {onOpen ? (
          <UnstyledButton
            aria-label={`预览${FILE_CATEGORY_LABELS[file.category]} ${file.name}`}
            className={cx(styles.tile, styles.tileOpenable)}
            onClick={onOpen}
            type="button"
          >
            {content}
          </UnstyledButton>
        ) : (
          <div className={styles.tile}>{content}</div>
        )}

        <EntryTileActions
          className={styles.actions}
          kind="file"
          onEdit={() => onEdit?.()}
          onRequestDelete={() => onRequestDelete?.()}
        />
      </div>
    );
  },
);

export default FileTile;
