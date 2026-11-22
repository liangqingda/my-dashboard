import { memo } from 'react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS } from '../constants';
import { formatFileSize } from '../utils/files';

import type { FileTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条文件：图标居上居中，文件名与体积纵向排在下方并居中，可被拖拽移动。
 * 图标按文件归类区分；hover 时右上角浮出重命名 / 删除按钮；文件内容与预览是单独任务，
 * 本瓦片暂不挂点击行为；名称最多两行，超出做中间省略保留尾部，hover 时给全量。
 */
const FileTile = memo(
  ({
    dragging = false,
    file,
    onDragEnd,
    onDragStartEntry,
    onEdit,
    onRequestDelete,
  }: FileTileProps) => {
    const Icon = CATEGORY_ICONS[file.category];
    const isVideo = file.category === 'video';

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
      >
        <div className={styles.tile}>
          <Icon
            aria-hidden="true"
            className={cx(styles.icon, isVideo && styles.iconVideo)}
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
        </div>

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
