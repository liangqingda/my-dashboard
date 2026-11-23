/**
 * 列表区：按当前展示形式把筛选后的文件夹 / 应用 / 文件铺成网格或表格，两种形态共用
 * 同一套拖拽与打开回调。滚动只发生在这一块里，纵向滚动条浮在内容之上；
 * 右侧固定留出一段比常规内边距更宽的空白，别让滚动条贴住列表内容。
 * 切换目录取数期间给整块蒙一层轻量 loading（旧内容留在下面，不清空闪烁）。
 */

import { LoadingOverlay, ScrollArea } from '@mantine/core';

import { cx } from '@/utils/cx';

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
  launchingApp,
  loading,
  loadingFolder,
  onDragEnd,
  onDragLeaveFolder,
  onDragOverFolder,
  onDragStartEntry,
  onDropFolder,
  onEditEntry,
  onOpenApp,
  onOpenFolder,
  onOpenImage,
  onOpenVideo,
  onRequestDeleteEntry,
  onRequestUninstallApp,
  rows,
  videoApp,
  videoOpenMode,
}: FilesEntriesProps) => (
  <div className={cx(styles.frame, isGridView && styles.gridFrame)}>
    <ScrollArea
      className={styles.scroll}
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
          launchingApp={launchingApp}
          loading={loading}
          loadingFolder={loadingFolder}
          onDragEnd={onDragEnd}
          onDragLeaveFolder={onDragLeaveFolder}
          onDragOverFolder={onDragOverFolder}
          onDragStartEntry={onDragStartEntry}
          onDropFolder={onDropFolder}
          onEditEntry={onEditEntry}
          onOpenApp={onOpenApp}
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
          launchingApp={launchingApp}
          listLoading={loading}
          loadingFolder={loadingFolder}
          onDragEnd={onDragEnd}
          onDragLeaveFolder={onDragLeaveFolder}
          onDragOverFolder={onDragOverFolder}
          onDragStartEntry={onDragStartEntry}
          onDropFolder={onDropFolder}
          onEditEntry={onEditEntry}
          onOpenApp={onOpenApp}
          onOpenFolder={onOpenFolder}
          onOpenImage={onOpenImage}
          onOpenVideo={onOpenVideo}
          onRequestDeleteEntry={onRequestDeleteEntry}
          onRequestUninstallApp={onRequestUninstallApp}
          rows={rows}
        />
      )}
    </ScrollArea>

    <LoadingOverlay
      loaderProps={{ size: 'sm', type: 'oval' }}
      overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
      visible={loading}
      zIndex={2}
    />
  </div>
);

export default FilesEntries;
