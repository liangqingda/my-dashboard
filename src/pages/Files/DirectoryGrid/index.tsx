import { IconFolderFilled } from '@tabler/icons-react';

import FileTile from '../FileTile';
import FolderTile from '../FolderTile';
import RenameTile from '../RenameTile';
import { CATEGORY_ICONS } from '../constants';
import type { FileEntry, FolderEntry } from '../types';

import type { DirectoryGridProps } from './types';

import styles from './index.scss';

/**
 * 目录网格：子文件夹排在前、文件排在后，自适应列宽铺满内容区。
 * 改名中的条目固定排在最前并换成输入框瓦片；条目可拖拽，文件夹是放置目标。
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
  onRenameCancel,
  onRenameCommit,
  onRequestDeleteEntry,
  renamingPath,
}: DirectoryGridProps) => {
  const renamingFolder = folders.find((folder) => folder.path === renamingPath) ?? null;
  const renamingFile = renamingFolder
    ? null
    : files.find((file) => file.path === renamingPath) ?? null;

  const orderedFolders = renamingFolder
    ? [renamingFolder, ...folders.filter((folder) => folder.path !== renamingPath)]
    : folders;
  const orderedFiles = renamingFile
    ? [renamingFile, ...files.filter((file) => file.path !== renamingPath)]
    : files;

  /** 改名瓦片的图标：文件夹给文件夹图标，文件按分类给文件图标 */
  const renderRenamingTile = (entry: FolderEntry | FileEntry) => {
    const Icon =
      'category' in entry ? CATEGORY_ICONS[entry.category] : IconFolderFilled;
    const icon = <Icon aria-hidden="true" size={48} stroke={1.2} />;

    return (
      <RenameTile
        icon={icon}
        key={entry.path}
        name={entry.name}
        onCancel={onRenameCancel}
        onCommit={(name) => onRenameCommit(entry.path, name)}
      />
    );
  };

  return (
    <div className={styles.grid}>
      {orderedFolders.map((folder) =>
        folder.path === renamingPath ? (
          renderRenamingTile(folder)
        ) : (
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
            onEdit={() => onEditEntry(folder.path)}
            onOpen={onOpenFolder}
            onRequestDelete={() => onRequestDeleteEntry(folder.path)}
          />
        ),
      )}
      {orderedFiles.map((file) =>
        file.path === renamingPath ? (
          renderRenamingTile(file)
        ) : (
          <FileTile
            dragging={dragSource === file.path}
            file={file}
            key={file.path}
            onDragEnd={onDragEnd}
            onDragStartEntry={() => onDragStartEntry(file.path)}
            onEdit={() => onEditEntry(file.path)}
            onRequestDelete={() => onRequestDeleteEntry(file.path)}
          />
        ),
      )}
    </div>
  );
};

export default DirectoryGrid;
