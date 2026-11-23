import { memo, useState } from 'react';
import { UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS, FILE_CATEGORY_LABELS } from '../constants';
import { formatFileSize } from '../utils/files';
import { fileThumbUrl, videoAppIconUrl } from '../utils/media-thumbs';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FileTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条文件：图源居上居中，文件名与体积纵向排在下方并居中，可被拖拽移动。
 * 图源跟 Finder 一个观感：图片摆缩略图、视频摆中间一帧；设置里选了「外部应用」时
 * 视频改成那个播放器的图标（改到哪个播放器就换哪个图标）。取不到图源回落分类图标。
 * hover 时右上角浮出重命名 / 删除按钮。
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
    videoApp,
    videoOpenMode,
  }: FileTileProps) => {
    const Icon = CATEGORY_ICONS[file.category];
    /** 媒体（视频 / 图片）图标单独上蓝，和文档类区分开 */
    const isMedia = file.category === 'video' || file.category === 'image';
    /** 视频交给外部应用打开：瓦片上摆的就是那个播放器的图标 */
    const usesAppIcon = file.category === 'video' && videoOpenMode === 'external';
    /** 图源加载失败（转码不出来 / 播放器没图标）后改回分类图标，不再重试 */
    const [thumbFailed, setThumbFailed] = useState(false);
    /** 图源随设置变化：视频改到外部模式时立刻换成播放器图标 */
    let thumbSrc: string | null = null;

    if (isMedia && !thumbFailed) {
      thumbSrc = usesAppIcon ? videoAppIconUrl(videoApp) : fileThumbUrl(file.path);
    }

    const content = (
      <>
        {thumbSrc === null ? (
          <Icon
            aria-hidden="true"
            className={cx(styles.icon, isMedia && styles.iconMedia)}
            size={48}
            stroke={1.2}
          />
        ) : (
          <img
            alt=""
            className={cx(styles.thumb, usesAppIcon && styles.appIcon)}
            decoding="async"
            draggable={false}
            loading="lazy"
            onError={() => setThumbFailed(true)}
            src={thumbSrc}
          />
        )}
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
