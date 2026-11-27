/**
 * 列表区：按当前展示形式把筛选后的文件夹 / 应用 / 文件铺成网格或表格，两种形态共用
 * 同一套拖拽与打开回调。滚动只发生在这一块里，纵向滚动条浮在内容之上；
 * 右侧固定留出一段比常规内边距更宽的空白，别让滚动条贴住列表内容。
 * 切换目录取数期间给整块蒙一层轻量 loading（旧内容留在下面，不清空闪烁）。
 */

import { useMemo } from 'react';
import { LoadingOverlay, ScrollArea } from '@mantine/core';

import { cx } from '@/utils/cx';

import BlankMoveMask from '../BlankMoveMask';
import DirectoryGrid from '../DirectoryGrid';
import FilesTable from '../FilesTable';
import { useBlankDrop } from '../hooks/useBlankDrop';

import type { FilesEntriesProps } from './types';

import styles from './index.scss';

const FilesEntries = ({
  apps,
  collapsedGroups,
  dragPaths,
  dropBlockedPath,
  dropTarget,
  emptyText,
  files,
  fixedColumns,
  folderProgress,
  folders,
  grouped,
  isGridView,
  launchingApp,
  loading,
  loadingFolder,
  onDragEnd,
  onDragLeaveFolder,
  onDragOverFolder,
  onDragStartEntry,
  onDropBlank,
  onDropFolder,
  onEditEntry,
  onOpenApp,
  onOpenExternalVideo,
  onOpenFolder,
  onOpenImage,
  onOpenVideo,
  onRequestDeleteEntry,
  onRequestUninstallApp,
  onSelectRange,
  onSetWallpaper,
  onToggleGroup,
  onTogglePending,
  pendingActive,
  pendingPaths,
  rows,
  tileMinWidth,
  tipsOff,
  veilOpacity,
  videoApp,
  videoOpenMode,
  videoThumbStyle,
}: FilesEntriesProps) => {
  /**
   * 搬进的目标是「当前这一层」（直接拖时拖到空白处）时，没有任何一格能画进度，
   * 就把「正在移入当前目录 x/y」挂在这块的上沿——落点在哪，进度就画在哪。
   */
  const movingCurrentDir =
    folderProgress !== null &&
    folders.every((folder) => folder.path !== folderProgress.targetDir);

  /** 连选用的显示顺序（文件夹在前、文件在后）：网格与表格共用这一份 */
  const selectOrder = useMemo(() => [...folders, ...files], [folders, files]);

  /**
   * 空白处落手＝搬进当前这一层：挂在**外框**上而不是网格 / 表格上。
   * 内容在 `ScrollArea` 里，网格只有内容那么高——目录空或条目少时，
   * 下面那一大片在滚动视口里、不属于网格，挂网格上那块就永远是死区。
   */
  const blank = useBlankDrop(onDropBlank);

  return (
    <div
      className={cx(
        styles.frame,
        isGridView && styles.gridFrame,
        blank.blankOver && styles.blankActive,
      )}
      {...blank.handlers}
    >
      {blank.blankOver ? (
        <span className={styles.blankHint}>松开即移入当前目录</span>
      ) : null}
      {movingCurrentDir ? (
        <BlankMoveMask done={folderProgress.done} total={folderProgress.total} />
      ) : null}
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
            collapsedGroups={collapsedGroups}
            dragPaths={dragPaths}
            dropBlockedPath={dropBlockedPath}
            dropTarget={dropTarget}
            emptyText={emptyText}
            files={files}
            fixedColumns={fixedColumns}
            folderProgress={folderProgress}
            folders={folders}
            grouped={grouped}
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
            onOpenExternalVideo={onOpenExternalVideo}
            onOpenFolder={onOpenFolder}
            onOpenImage={onOpenImage}
            onOpenVideo={onOpenVideo}
            onRequestDeleteEntry={onRequestDeleteEntry}
            onRequestUninstallApp={onRequestUninstallApp}
            onSelectRange={onSelectRange}
            onSetWallpaper={onSetWallpaper}
            onToggleGroup={onToggleGroup}
            onTogglePending={onTogglePending}
            pendingActive={pendingActive}
            pendingPaths={pendingPaths}
            selectOrder={selectOrder}
            tileMinWidth={tileMinWidth}
            tipsOff={tipsOff}
            veilOpacity={veilOpacity}
            videoApp={videoApp}
            videoOpenMode={videoOpenMode}
            videoThumbStyle={videoThumbStyle}
          />
        ) : (
          <FilesTable
            collapsedGroups={collapsedGroups}
            dragPaths={dragPaths}
            dropTarget={dropTarget}
            emptyText={emptyText}
            folderProgress={folderProgress}
            grouped={grouped}
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
            onSelectRange={onSelectRange}
            onSetWallpaper={onSetWallpaper}
            onToggleGroup={onToggleGroup}
            onTogglePending={onTogglePending}
            pendingActive={pendingActive}
            pendingPaths={pendingPaths}
            rows={rows}
            selectOrder={selectOrder}
            tipsOff={tipsOff}
          />
        )}
      </ScrollArea>

      <LoadingOverlay
        loaderProps={{ size: 'sm', type: 'oval' }}
        /*
         * 遮罩走全站毛玻璃的「加载」档：组件库按 color + backgroundOpacity 拼底色，
         * 这里把底色清掉、只留类名，底色与虚化都在 `index.scss` 的 `.loadingGlass` 里，
         * 与弹窗遮罩同一套令牌。
         */
        overlayProps={{
          backgroundOpacity: 0,
          blur: 0,
          className: styles.loadingGlass,
        }}
        visible={loading}
        zIndex={2}
      />
    </div>
  );
};

export default FilesEntries;
