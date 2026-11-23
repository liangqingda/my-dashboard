/**
 * 列表区：按当前展示形式把筛选后的文件夹 / 应用 / 文件铺成网格或表格，两种形态共用
 * 同一套拖拽与打开回调。滚动只发生在这一块里，纵向滚动条浮在内容之上；
 * 右侧固定留出一段比常规内边距更宽的空白，别让滚动条贴住列表内容。
 */

import { ScrollArea } from '@mantine/core';

import DirectoryGrid from '../DirectoryGrid';
import FilesTable from '../FilesTable';

import type { FilesEntriesProps } from './types';

import styles from './index.scss';

const FilesEntries = ({
  apps,
  dragSource,
  dropTarget,
  files,
  folders,
  isGridView,
  rows,
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
}: FilesEntriesProps) => (
  <ScrollArea
    className={isGridView ? styles.list : styles.tableList}
    offsetScrollbars="y"
    scrollbarSize={6}
    scrollbars="y"
    styles={{
      viewport: isGridView
        ? {
            paddingBottom: 12,
            paddingInlineEnd: 16,
            paddingInlineStart: 12,
            paddingTop: 12,
          }
        : {
            paddingInlineEnd: 16,
          },
    }}
    type="auto"
  >
    {isGridView ? (
      <DirectoryGrid
        apps={apps}
        dragSource={dragSource}
        dropTarget={dropTarget}
        files={files}
        folders={folders}
        onDragEnd={onDragEnd}
        onDragLeaveFolder={onDragLeaveFolder}
        onDragOverFolder={onDragOverFolder}
        onDragStartEntry={onDragStartEntry}
        onDropFolder={onDropFolder}
        onEditEntry={onEditEntry}
        onOpenFolder={onOpenFolder}
        onOpenImage={onOpenImage}
        onOpenVideo={onOpenVideo}
        onRequestDeleteEntry={onRequestDeleteEntry}
        onRequestUninstallApp={onRequestUninstallApp}
        videoApp={videoApp}
        videoOpenMode={videoOpenMode}
      />
    ) : (
      <FilesTable
        dragSource={dragSource}
        dropTarget={dropTarget}
        onDragEnd={onDragEnd}
        onDragLeaveFolder={onDragLeaveFolder}
        onDragOverFolder={onDragOverFolder}
        onDragStartEntry={onDragStartEntry}
        onDropFolder={onDropFolder}
        onEditEntry={onEditEntry}
        onOpenFolder={onOpenFolder}
        onOpenImage={onOpenImage}
        onOpenVideo={onOpenVideo}
        onRequestDeleteEntry={onRequestDeleteEntry}
        onRequestUninstallApp={onRequestUninstallApp}
        rows={rows}
      />
    )}
  </ScrollArea>
);

export default FilesEntries;
