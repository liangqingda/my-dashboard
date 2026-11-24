import { Tooltip, UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { FILE_CATEGORY_LABELS } from '../../constants';
import type { DraggableEntry, FileEntry } from '../../types';
import { writeDragPayload } from '../../utils/drag-image';
import { entryIcon } from '../../utils/entry-icon';

import type { HandCardProps } from './types';

import styles from './index.scss';

/** 叠在左下角的层数上限：超过三层就只画三层，数量由左上角红点说明 */
const MAX_LAYERS = 3;

/** 能点开内置预览的分类：与目录页点瓦片打开的那两扇预览同口径 */
const PREVIEW_CATEGORIES = new Set<FileEntry['category']>(['image', 'video']);

/** 卡片上的名字：单项就是它自己，多项给「第一项 等 N 项」 */
const handLabel = (entries: DraggableEntry[]): string =>
  entries.length === 1
    ? entries[0].name
    : `${entries[0].name} 等 ${entries.length} 项`;

/**
 * 手持卡片：被拖的条目本体摆在弹窗里，可以再次拖起（浏览器松手后就结束了整次拖拽，
 * 不重新拿起来就没法落点）。多项时图标叠三层、左上角红点标数量。
 *
 * 实线＝正拖着它；虚线 + 呼吸光＝已经放回手里、等你再拖一次。
 * 只有一条且是可预览的图片 / 视频时，图标本身才可点——点它不拖，打开内置预览。
 */
const HandCard = ({
  entries,
  handed,
  onDragEnd,
  onDragStart,
  onPreview,
}: HandCardProps) => {
  const layers = entries.slice(0, MAX_LAYERS);
  /** 单项才谈得上「预览的是哪一个」；多项时图标只是一个集合标记 */
  const previewFile =
    entries.length === 1 &&
    'category' in entries[0] &&
    PREVIEW_CATEGORIES.has(entries[0].category)
      ? entries[0]
      : null;

  const stack = (
    <div className={styles.stack}>
      {layers.map((entry, index) => {
        const Icon = entryIcon(entry);

        return (
          <span
            className={styles.layer}
            key={entry.path}
            style={{
              transform: `translate(${index * -4}px, ${index * -4}px) scale(${1 - index * 0.1})`,
              zIndex: layers.length - index,
            }}
          >
            <Icon
              aria-hidden="true"
              className={cx(styles.icon, previewFile && styles.iconClickable)}
              size={22}
              stroke={1.2}
            />
          </span>
        );
      })}
    </div>
  );

  return (
    <div
      className={cx(styles.card, handed ? styles.idle : styles.live)}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        writeDragPayload(
          event.dataTransfer,
          entries.map((entry) => entry.path),
        );
        onDragStart();
      }}
    >
      {previewFile === null ? (
        stack
      ) : (
        <Tooltip label={`预览${FILE_CATEGORY_LABELS[previewFile.category]}`} withArrow>
          <UnstyledButton
            aria-label={`预览${FILE_CATEGORY_LABELS[previewFile.category]} ${previewFile.name}`}
            className={styles.iconButton}
            component="span"
            onClick={() => onPreview?.(previewFile)}
          >
            {stack}
          </UnstyledButton>
        </Tooltip>
      )}

      {entries.length > 1 ? (
        <span aria-hidden="true" className={styles.count}>
          {entries.length}
        </span>
      ) : null}

      <FreeTruncatedText
        className={styles.name}
        ellipsis="middle"
        text={handLabel(entries)}
      />
      <span className={styles.badge}>{handed ? '待拖拽' : '拖拽中'}</span>
    </div>
  );
};

export default HandCard;
