import FolderTile from '../FolderTile';
import VideoTile from '../VideoTile';

import type { DirectoryGridProps } from './types';

import styles from './index.scss';

/**
 * 目录网格：子文件夹排在前、视频文件排在后，自适应列宽铺满内容区。
 * 条目数量已经整份在客户端，不做分页或虚拟滚动（见 `docs/pages.md`）。
 */
const DirectoryGrid = ({ folders, videos, onOpenFolder }: DirectoryGridProps) => (
  <div className={styles.grid}>
    {folders.map((folder) => (
      <FolderTile folder={folder} key={folder.path} onOpen={onOpenFolder} />
    ))}
    {videos.map((video) => (
      <VideoTile key={video.path} video={video} />
    ))}
  </div>
);

export default DirectoryGrid;
