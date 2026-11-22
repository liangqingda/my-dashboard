import FileTile from '../FileTile';
import FolderTile from '../FolderTile';

import type { DirectoryGridProps } from './types';

import styles from './index.scss';

/**
 * 目录网格：子文件夹排在前、文件排在后，自适应列宽铺满内容区。
 * 条目数量已经整份在客户端，不做分页或虚拟滚动（见 `docs/pages.md`）。
 */
const DirectoryGrid = ({ files, folders, onOpenFolder }: DirectoryGridProps) => (
  <div className={styles.grid}>
    {folders.map((folder) => (
      <FolderTile folder={folder} key={folder.path} onOpen={onOpenFolder} />
    ))}
    {files.map((file) => (
      <FileTile file={file} key={file.path} />
    ))}
  </div>
);

export default DirectoryGrid;
