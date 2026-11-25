import type { DragEvent, MouseEvent, ReactNode } from 'react';
import { useMemo } from 'react';

import { cx } from '@/utils/cx';

import AppTile from '../AppTile';
import EntryGroupHeader from '../EntryGroupHeader';
import { ENTRY_KIND_LABELS } from '../constants';
import type { FileEntry, FolderEntry } from '../types';
import FileTile from '../FileTile';
import FolderTile from '../FolderTile';
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
 * 分组模式下按「文件夹 → 应用 → 文件」切成纵向分段，每段带一条分组标题，
 * 外观对齐 macOS 访达的分组；分组开关在设置面板里，默认平铺。
 *
 * 多选（待拖拽区）在**容器**上一次性接住，而不是给每个瓦片加一层 onClick：
 * 瓦片自己的点击是「打开 / 预览」，这里在捕获阶段先判断——带 ⌘ / Shift，
 * 或待拖拽区已经非空时，点条目就变成加入 / 移除，并拦住瓦片原本的打开行为。
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

  const renderFiles = () =>
    files.map((file) => (
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
    ));

  /** 段内瓦片网格：列宽口径与平铺网格同一份规则 */
  const groupGrid = (tiles: ReactNode) => (
    <div className={cx(styles.grid, fixedColumns && styles.gridFixed)}>{tiles}</div>
  );

  const renderGrouped = () => (
    <>
      {folders.length > 0 ? (
        <section className={styles.group}>
          <EntryGroupHeader label={ENTRY_KIND_LABELS.folder} />
          {groupGrid(renderFolders())}
        </section>
      ) : null}
      {apps.length > 0 ? (
        <section className={styles.group}>
          <EntryGroupHeader label={ENTRY_KIND_LABELS.app} />
          {groupGrid(renderApps())}
        </section>
      ) : null}
      {files.length > 0 ? (
        <section className={styles.group}>
          <EntryGroupHeader label={ENTRY_KIND_LABELS.file} />
          {groupGrid(renderFiles())}
        </section>
      ) : null}
    </>
  );

  return (
    <div
      className={cx(
        styles.grid,
        fixedColumns && styles.gridFixed,
        grouped && styles.grouped,
      )}
      onClickCapture={handleClickCapture}
      onDragOver={allowMoveOverGrid}
    >
      {grouped ? renderGrouped() : (
        <>
          {renderFolders()}
          {renderApps()}
          {renderFiles()}
        </>
      )}
    </div>
  );
};

export default DirectoryGrid;
