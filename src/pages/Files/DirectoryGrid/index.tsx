import type { DragEvent } from 'react';

import AppTile from '../AppTile';
import type { FileEntry } from '../types';
import FileTile from '../FileTile';
import FolderTile from '../FolderTile';

import type { DirectoryGridProps } from './types';

import styles from './index.scss';

/** 网格空白处也吞掉 dragover，免得掠过瓦片间隙时浏览器把光标打回「禁止放置」 */
const allowMoveOverGrid = (event: DragEvent<HTMLDivElement>) => {
  const { dataTransfer } = event;

  event.preventDefault();
  dataTransfer.dropEffect = 'move';
};

/**
 * 目录网格：子文件夹排在前、应用其次、文件排在后，自适应列宽铺满内容区。
 * 改名统一走弹窗，不改动网格位置；文件夹与文件可拖拽，文件夹是放置目标；
 * 应用只展示与卸载，不参与拖拽移动。拖拽落在空白处不触发移动，等同取消。
 * 条目数量已经整份在客户端，不做分页或虚拟滚动（见 `docs/pages.md`）。
 */
/** 可预览的文件按分类分给对应的弹窗；其它文件点不动 */
const previewHandler = (
  file: FileEntry,
  onOpenVideo: (file: FileEntry) => void,
  onOpenImage: (file: FileEntry) => void,
): (() => void) | undefined => {
  if (file.category === 'video') {
    return () => onOpenVideo(file);
  }

  if (file.category === 'image') {
    return () => onOpenImage(file);
  }

  return undefined;
};

const DirectoryGrid = ({
  apps,
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
  onOpenImage,
  onOpenVideo,
  onRequestDeleteEntry,
  onRequestUninstallApp,
  videoApp,
  videoOpenMode,
}: DirectoryGridProps) => (
  <div className={styles.grid} onDragOver={allowMoveOverGrid}>
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
    {apps.map((app) => (
      <AppTile
        app={app}
        key={app.path}
        onRequestUninstall={() => onRequestUninstallApp(app)}
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
        onOpen={previewHandler(file, onOpenVideo, onOpenImage)}
        onRequestDelete={() => onRequestDeleteEntry(file.path)}
        videoApp={videoApp}
        videoOpenMode={videoOpenMode}
      />
    ))}
  </div>
);

export default DirectoryGrid;
