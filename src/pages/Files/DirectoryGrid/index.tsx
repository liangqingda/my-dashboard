import type { DragEvent, MouseEvent, ReactNode } from 'react';
import { useMemo } from 'react';

import { cx } from '@/utils/cx';

import AppTile from '../AppTile';
import EntryGroupHeader from '../EntryGroupHeader';
import { ENTRY_GROUP_LABELS } from '../constants';
import type { EntryGroupKey, FileEntry, FolderEntry } from '../types';
import FileTile from '../FileTile';
import FolderTile from '../FolderTile';
import { groupFilesByCategory } from '../utils/entries-view';
import { isAppFolder } from '../utils/files';
import { tileIconSize } from '../utils/tile-metrics';

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
 * 应用可点击打开、也可卸载，不参与拖拽移动。拖拽落在空白处不触发移动，等同取消。
 * 条目数量已经整份在客户端，不做分页或虚拟滚动（见 `docs/pages.md`）。
 *
 * 分组模式下按「文件夹 → 应用 → 文件分类」切成纵向分段，每段带一条分组标题，
 * 点标题整行切换展开 / 收起（收起有高度过渡），段与段之间用分割线隔开；
 * 分组开关在设置面板里，默认平铺。
 *
 * 多选（待拖拽区）在容器捕获阶段统一接住：带 ⌘ / Shift，或待拖拽区已非空时，
 * 点条目变成加入 / 移除，并拦住瓦片原本的打开行为。
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
  collapsedGroups,
  dragSource,
  dropBlockedPath,
  dropTarget,
  files,
  fixedColumns,
  folders,
  grouped,
  loading,
  loadingFolder,
  onDragEnd,
  onDragLeaveFolder,
  onDragOverFolder,
  onDragStartEntry,
  onDropFolder,
  onEditEntry,
  onOpenApp,
  onOpenExternalVideo,
  onOpenFolder,
  onOpenImage,
  onOpenVideo,
  onRequestDeleteEntry,
  onRequestUninstallApp,
  onToggleGroup,
  onTogglePending,
  pendingActive,
  pendingPaths,
  launchingApp,
  tipsOff,
  veilOpacity,
  videoApp,
  videoOpenMode,
  videoThumbStyle,
}: DirectoryGridProps) => {
  /** 选中框要按路径查，列表转 Set 一次，免得每个瓦片都 `includes` 一遍 */
  const pendingSet = useMemo(() => new Set(pendingPaths), [pendingPaths]);
  /** 点条目时按路径反查条目本体：多选语义要的是完整条目，不是路径 */
  const byPath = useMemo(() => {
    const map = new Map<string, FolderEntry | FileEntry>();

    for (const folder of folders) {
      map.set(folder.path, folder);
    }

    for (const file of files) {
      map.set(file.path, file);
    }

    return map;
  }, [files, folders]);

  /** 文件按分类归段：分组模式下每一段一种分类 */
  const fileGroups = useMemo(() => groupFilesByCategory(files), [files]);

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const { target } = event;

    // 瓦片右上角的重命名 / 删除自带 onClick，带 ⌘ 点它们不该被当成「选中条目」
    /*
     * 用 `Element` 而不是 `HTMLElement`：文件夹 / 文件图标是 SVG，
     * 点图标时目标不是 HTML 元素，按 `HTMLElement` 判会漏掉「点图标选中」这一路。
     */
    if (target instanceof Element && target.closest('[data-tile-actions]') !== null) {
      return;
    }

    const tile = target instanceof Element ? target.closest('[data-entry-path]') : null;

    if (!(tile instanceof HTMLElement)) {
      return;
    }

    const entry = tile.dataset.entryPath ? byPath.get(tile.dataset.entryPath) : undefined;

    if (entry === undefined) {
      return;
    }

    // ⌘ / Shift 单独就能起选；待拖拽区一旦非空，普通点击也按「加入 / 移除」算
    if (!pendingActive && !event.metaKey && !event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    // 瓦片的屏幕矩形交给页面：加入待拖拽区时用它当飞行动画的起点
    onTogglePending(entry, tile.getBoundingClientRect());
  };

  const renderFolders = () =>
    folders.map((folder) => (
      <FolderTile
        dragging={dragSource === folder.path}
        dropActive={dropTarget === folder.path}
        dropBlocked={dropBlockedPath === folder.path}
        folder={folder}
        hideActions={pendingActive}
        iconSize={
          fixedColumns || isAppFolder(folder) ? tileIconSize() : undefined
        }
        key={folder.path}
        loading={loading && loadingFolder === folder.path}
        onDragEnd={onDragEnd}
        onDragLeave={() => onDragLeaveFolder(folder.path)}
        onDragOver={(event) => onDragOverFolder(folder.path, event)}
        onDragStartEntry={() => onDragStartEntry(folder)}
        onDrop={() => onDropFolder(folder.path)}
        onEdit={() => onEditEntry(folder)}
        onOpen={onOpenFolder}
        onRequestDelete={() => onRequestDeleteEntry(folder.path)}
        pending={pendingSet.has(folder.path)}
        tipOff={tipsOff}
        veilOpacity={veilOpacity}
      />
    ));

  const renderApps = () =>
    apps.map((app) => (
      <AppTile
        app={app}
        key={app.path}
        launching={launchingApp === app.path}
        onOpen={() => onOpenApp(app)}
        onRequestUninstall={() => onRequestUninstallApp(app)}
        tipOff={tipsOff}
        veilOpacity={veilOpacity}
      />
    ));

  const renderFileTile = (file: FileEntry) => (
    <FileTile
      dragging={dragSource === file.path}
      file={file}
      hideActions={pendingActive}
      key={file.path}
      onDragEnd={onDragEnd}
      onDragStartEntry={() => onDragStartEntry(file)}
      onEdit={() => onEditEntry(file)}
      onOpen={previewHandler(file, onOpenVideo, onOpenImage)}
      onOpenExternal={onOpenExternalVideo}
      onRequestDelete={() => onRequestDeleteEntry(file.path)}
      pending={pendingSet.has(file.path)}
      tipOff={tipsOff}
      veilOpacity={veilOpacity}
      videoApp={videoApp}
      videoOpenMode={videoOpenMode}
      videoThumbStyle={videoThumbStyle}
    />
  );

  /** 一个分组段：标题整行可折叠，段内瓦片走网格列宽规则 */
  const renderGroup = (key: EntryGroupKey, tiles: ReactNode, count: number) => {
    if (count === 0) {
      return null;
    }

    const collapsed = collapsedGroups.has(key);

    return (
      <section className={cx(styles.group, collapsed && styles.groupCollapsed)}>
        <EntryGroupHeader
          collapsed={collapsed}
          label={ENTRY_GROUP_LABELS[key]}
          onToggle={() => onToggleGroup(key)}
        />
        <div className={cx(styles.body, collapsed && styles.bodyCollapsed)}>
          <div className={styles.bodyInner}>
            <div className={cx(styles.grid, fixedColumns && styles.gridFixed)}>
              {tiles}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderGrouped = () => (
    <>
      {renderGroup('folder', renderFolders(), folders.length)}
      {renderGroup('app', renderApps(), apps.length)}
      {fileGroups.map((group) =>
        renderGroup(
          group.key,
          group.entries.map(renderFileTile),
          group.entries.length,
        ),
      )}
    </>
  );

  return (
    <div
      className={
        grouped
          ? styles.grouped
          : cx(styles.grid, fixedColumns && styles.gridFixed)
      }
      onClickCapture={handleClickCapture}
      onDragOver={allowMoveOverGrid}
    >
      {grouped ? (
        renderGrouped()
      ) : (
        <>
          {renderFolders()}
          {renderApps()}
          {files.map(renderFileTile)}
        </>
      )}
    </div>
  );
};

export default DirectoryGrid;
