import FileTile from '../FileTile';
import FolderTile from '../FolderTile';

import type { DirectoryGridProps } from './types';

import styles from './index.scss';

/**
 * 目录网格：子文件夹排在前、文件排在后，自适应列宽铺满内容区。
 * 改名统一走弹窗，不改动网格位置；条目可拖拽，文件夹是放置目标。
 * 条目数量已经整份在客户端，不做分页或虚拟滚动（见 `docs/pages.md`）。
 */
const DirectoryGrid = ({
  dragSource,
  dropTarget,
  files,
  folders,
  onDragEnd,
  onDragLeaveFolder,
  onDragOverFolder,
  onDragStartEntry,
  onDropFolder,
  onEditEntry,
  onOpenFolder,
  onRequestDeleteEntry,
}: DirectoryGridProps) => (
  <div className={styles.grid}>
    {folders.map((folder) => (
      <FolderTile
        dragging={dragSource === folder.path}
        dropActive={dropTarget === folder.path}
        folder={folder}
        key={folder.path}
        onDragEnd={onDragEnd}
        onDragLeave={() => onDragLeaveFolder(folder.path)}
        onDragOver={(event) => onDragOverFolder(folder.path, event)}
        onDragStartEntry={() => onDragStartEntry(folder.path)}
        onDrop={() => onDropFolder(folder.path)}
        onEdit={() => onEditEntry(folder)}
        onOpen={onOpenFolder}
        onRequestDelete={() => onRequestDeleteEntry(folder.path)}
      />
    ))}
    {files.map((file) => (
      <FileTile
        dragging={dragSource === file.path}
        file={file}
        key={file.path}
        onDragEnd={onDragEnd}
        onDragStartEntry={() => onDragStartEntry(file.path)}
        onEdit={() => onEditEntry(file)}
        onRequestDelete={() => onRequestDeleteEntry(file.path)}
      />
    ))}
  </div>
);

export default DirectoryGrid;
