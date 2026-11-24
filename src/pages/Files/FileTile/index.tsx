import { memo, useState } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import TileVeil from '../TileVeil';
import {
  CATEGORY_ICONS,
  FILE_CATEGORY_LABELS,
} from '../constants';
import { formatFileSize } from '../utils/files';
import { fileThumbUrl, videoAppIconUrl } from '../utils/media-thumbs';
import { tileIconSize } from '../utils/tile-metrics';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FileTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条文件：图源居上居中，文件名与体积纵向排在下方并居中，可被拖拽移动。
 * 图源跟 Finder 一个观感：图片摆缩略图、视频摆中间一帧；图片摆的是缩略图时，
 * 体积旁补一枚分类图标（与表格模式同一枚），缩略图不说明它是图片类型；
 * 设置里选了「外部应用」时
 * 视频大图默认换那个播放器的图标，也可切成仍摆视频帧——这时播放器图标缩到体积右侧，
 * 用一条竖线隔开，既保留识别也还能看见画面。取不到图源回落分类图标。
 * hover 时右上角浮出重命名 / 删除按钮，同时盖一层暗色遮罩：缩略图与视频帧都偏亮，
 * 不压一层按钮和文字都看不清。遮罩盖住图源、文字与按钮浮在它上面。
 * 视频 / 图片（调用方传了 `onOpen`）整块可点，交给对应的预览弹窗；其它文件仍只是展示。
 * 体积旁的播放器小图标可单独点（`onOpenExternal`），绕开弹窗直接交给外部应用。
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
    onOpenExternal,
    onRequestDelete,
    veilOpacity = 100,
    videoApp,
    videoOpenMode,
    videoThumbStyle = 'app-icon',
  }: FileTileProps) => {
    const Icon = CATEGORY_ICONS[file.category];
    /** 媒体（视频 / 图片）图标单独上蓝，和文档类区分开 */
    const isMedia = file.category === 'video' || file.category === 'image';
    const isVideo = file.category === 'video';
    /** 视频交给外部应用打开：默认瓦片上摆的就是那个播放器的图标 */
    const isExternalVideo = isVideo && videoOpenMode === 'external';
    /** 大图到底摆不摆播放器图标：外部打开且设置里选了「应用图标」时才摆 */
    const usesAppIcon = isExternalVideo && videoThumbStyle === 'app-icon';
    /**
     * 封面是视频帧时（外部模式的「视频帧」一档，或干脆是弹窗预览），播放器图标缩到体积右侧；
     * 这枚小图标可点，点它就绕开弹窗、直接交给外部应用。
     */
    const showsAppBadge = isVideo && !usesAppIcon;
    /** 图源加载失败（转码不出来 / 播放器没图标）后改回分类图标，不再重试 */
    const [thumbFailed, setThumbFailed] = useState(false);
    /** 体积旁的小播放器图标同样取不到就只留体积，不占空位 */
    const [appBadgeFailed, setAppBadgeFailed] = useState(false);
    /** 图源随设置变化：视频改到外部模式时立刻换成播放器图标 */
    let thumbSrc: string | null = null;

    if (isMedia && !thumbFailed) {
      thumbSrc = usesAppIcon ? videoAppIconUrl(videoApp) : fileThumbUrl(file.path);
    }

    /**
     * 图片瓦片摆的是缩略图：体积旁补一枚图片图标，与表格模式同一枚分类图标。
     * 缩略图取不到时主图标本身就是它，不必再来一枚。
     */
    const showsImageBadge = file.category === 'image' && thumbSrc !== null;

    const content = (
      <>
        {thumbSrc === null ? (
          <Icon
            aria-hidden="true"
            className={cx(styles.icon, isMedia && styles.iconMedia)}
            size={tileIconSize()}
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
          <span className={styles.meta}>
            {formatFileSize(file.size)}
            {showsImageBadge ? (
              <Icon
                aria-hidden="true"
                className={styles.imageBadge}
                size={18}
                stroke={1.2}
              />
            ) : null}
            {showsAppBadge && !appBadgeFailed ? (
              <Tooltip label={`用 ${videoApp} 打开`} withArrow>
                <UnstyledButton
                  aria-label={`用 ${videoApp} 打开 ${file.name}`}
                  className={styles.appBadgeButton}
                  component="span"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenExternal?.(file.path);
                  }}
                >
                  <img
                    alt=""
                    className={styles.appBadge}
                    decoding="async"
                    draggable={false}
                    height={22}
                    loading="lazy"
                    onError={() => setAppBadgeFailed(true)}
                    src={videoAppIconUrl(videoApp)}
                    width={22}
                  />
                </UnstyledButton>
              </Tooltip>
            ) : null}
          </span>
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
        <TileVeil opacity={veilOpacity} />
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
