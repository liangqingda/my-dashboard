import { memo } from 'react';
import {
  IconArchive,
  IconFile,
  IconFileText,
  IconMusic,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { formatFileSize } from '../utils/files';
import type { FileCategory } from '../types';

import type { FileTileProps } from './types';

import styles from './index.scss';

/** 分类 → 瓦片图标；视频额外上蓝色，其余用通用弱色 */
const CATEGORY_ICONS: Record<FileCategory, typeof IconFile> = {
  video: IconVideo,
  image: IconPhoto,
  audio: IconMusic,
  document: IconFileText,
  archive: IconArchive,
  other: IconFile,
};

/**
 * 网格里的一条文件：图标居上居中，文件名与体积纵向排在下方并居中。
 * 图标按文件归类区分；文件内容与预览是单独任务，本瓦片暂不挂点击行为；
 * 名称最多两行，超出做中间省略保留尾部，hover 时给全量。
 */
const FileTile = memo(({ file }: FileTileProps) => {
  const Icon = CATEGORY_ICONS[file.category];
  const isVideo = file.category === 'video';

  return (
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
  );
});

export default FileTile;
