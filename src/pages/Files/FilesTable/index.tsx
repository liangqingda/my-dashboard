/**
 * 目录表格：一行一个条目，三列「名称 / 类别 / 操作」，文件夹在前、应用其次、文件在后。
 * 行可拖拽（应用除外，移动 .app 会破坏系统登记），文件夹行是放置目标；
 * 重命名 / 删除走与瓦片同一组按钮，应用只有卸载一项。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 * 分组模式下按「文件夹 → 应用 → 文件」切成纵向分段，段标题外观走 `EntryGroupHeader`。
 */

import type { DragEvent, MouseEvent } from 'react';
import { memo, useMemo } from 'react';

import FreeTable from '@/components/tables/FreeTable';
import { cx } from '@/utils/cx';

import EntryGroupHeader from '../EntryGroupHeader';
import EntryTileActions from '../EntryTileActions';
import TableNameCell from '../TableNameCell';
import { ENTRY_KIND_LABELS } from '../constants';
import type { FileEntry, FilesRow, FolderEntry } from '../types';
import { entryOf, groupFilesRows } from '../utils/entries-view';
import { writeDragPayload } from '../utils/drag-image';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FilesTableProps } from './types';

import styles from './index.scss';

const FilesTable = memo(
  ({
    dragSource,
    dropTarget,
    grouped,
    launchingApp,
    listLoading,
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
    onTogglePending,
    pendingActive,
    pendingPaths,
    rows,
    tipsOff,
  }: FilesTableProps) => {
    /** 选中态按路径查：列表转 Set 一次，免得每行都 `includes` */
    const pendingSet = useMemo(() => new Set(pendingPaths), [pendingPaths]);
    /** 点行时按路径反查条目本体（应用不参与多选） */
    const byPath = useMemo(() => {
      const map = new Map<string, FileEntry | FolderEntry>();

      for (const row of rows) {
        if (row.kind === 'folder') {
          map.set(row.folder.path, row.folder);
        } else if (row.kind === 'file') {
          map.set(row.file.path, row.file);
        }
      }

      return map;
    }, [rows]);

    /** 分组模式：把行按类型归进固定顺序的分段，空组已丢掉 */
    const groups = useMemo(
      () => (grouped ? groupFilesRows(rows) : []),
      [grouped, rows],
    );

    /**
     * 待拖拽区非空（或带 ⌘ / Shift）时，点在行上就是加入 / 移出：
     * 在容器捕获阶段拦下，行里那些「打开文件夹 / 预览」的按钮就不会跟着响应。
     */
    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
      const { target } = event;

      // 用 `Element`：行里的类型图标是 SVG，点图标时目标不是 HTML 元素
      if (target instanceof Element && target.closest('[data-tile-actions]') !== null) {
        return;
      }

      const row = target instanceof Element ? target.closest('[data-entry-path]') : null;

      if (!(row instanceof HTMLElement) || row.dataset.entryPath === undefined) {
        return;
      }

      const entry = byPath.get(row.dataset.entryPath);

      if (entry === undefined) {
        return;
      }

      if (!pendingActive && !event.metaKey && !event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onTogglePending(entry, row.getBoundingClientRect());
    };

    const renderRow = (row: FilesRow) => {
      const entry = entryOf(row);
      const isFolder = row.kind === 'folder';
      const isApp = row.kind === 'app';
      const dragging = !isApp && dragSource === entry.path;
      const dropActive = isFolder && dropTarget === entry.path;
      let onEdit: (() => void) | undefined;
      let onRequestDelete: () => void;

      if (row.kind === 'app') {
        onRequestDelete = () => onRequestUninstallApp(row.app);
      } else {
        const editable = row.kind === 'folder' ? row.folder : row.file;

        onEdit = () => onEditEntry(editable);
        onRequestDelete = () => onRequestDeleteEntry(editable.path);
      }

      return (
        <FreeTable.Tr
          className={cx(
            isFolder && styles.clickable,
            dragging && styles.dragging,
            dropActive && styles.dropActive,
            pendingSet.has(entry.path) && styles.pending,
          )}
          data-entry-path={isApp ? undefined : entry.path}
          draggable={!isApp}
          key={entry.path}
          onClick={isFolder ? () => onOpenFolder(entry.path) : undefined}
          onDragEnd={onDragEnd}
          onDragLeave={
            isFolder ? () => onDragLeaveFolder(entry.path) : undefined
          }
          onDragOver={
            isFolder
              ? (event: DragEvent<HTMLTableRowElement>) =>
                  onDragOverFolder(entry.path, event)
              : undefined
          }
          onDragStart={(event) => {
            /* 应用不是拖拽源（整包移动会破坏系统登记），这里只是把类型收窄回来 */
            if (row.kind === 'app') {
              return;
            }

            writeDragPayload(event.dataTransfer, [entry.path]);
            onDragStartEntry(row.kind === 'folder' ? row.folder : row.file);
          }}
          onDrop={isFolder ? () => onDropFolder(entry.path) : undefined}
          onMouseEnter={
            row.kind === 'file' && row.file.category === 'video'
              ? () => prefetchVideoHead(row.file.path)
              : undefined
          }
        >
          <FreeTable.Td>
            <TableNameCell
              launchingApp={launchingApp}
              listLoading={listLoading}
              loadingFolder={loadingFolder}
              onOpenApp={onOpenApp}
              onOpenFolder={onOpenFolder}
              onOpenImage={onOpenImage}
              onOpenVideo={onOpenVideo}
              row={row}
              tipsOff={tipsOff}
            />
          </FreeTable.Td>
          <FreeTable.Td className={styles.kindWidth}>
            {ENTRY_KIND_LABELS[row.kind]}
          </FreeTable.Td>
          <FreeTable.Td className={styles.actionWidth}>
            <EntryTileActions
              className={styles.rowActions}
              kind={row.kind}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
            />
          </FreeTable.Td>
        </FreeTable.Tr>
      );
    };

    return (
      <div className={styles.tableFrame} onClickCapture={handleClickCapture}>
        <FreeTable layout="fixed">
          <FreeTable.Thead>
            <FreeTable.Tr>
              <FreeTable.Th scope="col">名称</FreeTable.Th>
              <FreeTable.Th className={styles.kindWidth} scope="col">
                类别
              </FreeTable.Th>
              <FreeTable.Th className={styles.actionWidth} scope="col">
                操作
              </FreeTable.Th>
            </FreeTable.Tr>
          </FreeTable.Thead>
          <FreeTable.Tbody>
            {grouped
              ? groups.flatMap((group) => [
                  <FreeTable.Tr className={styles.groupRow} key={group.key}>
                    <FreeTable.Td colSpan={3}>
                      <EntryGroupHeader label={ENTRY_KIND_LABELS[group.key]} />
                    </FreeTable.Td>
                  </FreeTable.Tr>,
                  ...group.entries.map(renderRow),
                ])
              : rows.map(renderRow)}
          </FreeTable.Tbody>
        </FreeTable>
      </div>
    );
  },
);

export default FilesTable;
