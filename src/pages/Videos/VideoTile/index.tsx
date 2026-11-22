import { memo } from 'react';
import { IconVideo } from '@tabler/icons-react';

import { formatFileSize } from '../utils/videos';

import type { VideoTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条视频文件：图标 + 文件名 + 体积。
 * 预览播放是单独任务，本瓦片暂不挂点击行为。
 */
const VideoTile = memo(({ video }: VideoTileProps) => (
  <div className={styles.tile}>
    <IconVideo aria-hidden="true" className={styles.icon} size={32} stroke={1.2} />
    <span className={styles.body}>
      <span className={styles.name}>{video.name}</span>
      <span className={styles.meta}>{formatFileSize(video.size)}</span>
    </span>
  </div>
));

export default VideoTile;
