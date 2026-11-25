/**
 * 目录表格：一行一个条目，三列「名称 / 类别 / 操作」，文件夹在前、应用其次、文件在后。
 * 名称前带类型图标（应用是真实图标，取不到时回落通用图标）；文件夹行整行可点进入下一层，
 * 视频 / 图片名称可点打开对应的预览弹窗，应用名称可点交给系统打开（与网格一致）；
 * 指针停到视频行上时先预取文件头，点开时首帧更快。
 * 行可拖拽（应用除外，移动 .app 会破坏系统登记），文件夹行是放置目标；
 * 重命名 / 删除走与瓦片同一组按钮，应用只有卸载一项。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 */

import type { DragEvent, MouseEvent } from 'react';
import { memo, useMemo } from 'react';
import { Loader, UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTable from '@/components/tables/FreeTable';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import AppIcon from '../AppIcon';
import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS, ENTRY_KIND_LABELS, FILE_CATEGORY_LABELS } from '../constants';
import type { FileEntry, FilesRow, FolderEntry } from '../types';
import { writeDragPayload } from '../utils/drag-image';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FilesTableProps } from './types';
import { entryOf } from './utils';

import styles from './index.scss';

/** 表格里的应用图标：与瓦片同一套「真实图标 → 通用图标」回落 */
const FilesTable = memo(
  ({
    dragSource,
    dropTarget,
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

    /** 名称前的类型图标：应用走真实图标 + 通用图标回落，其余按分类换图标 */
    const renderIcon = (row: FilesRow) => {
      if (row.kind === 'app') {
        return (
          <AppIcon app={row.app} className={styles.icon} size={16} />
        );
      }

      if (row.kind === 'folder') {
        return (
          <IconFolderFilled
            aria-hidden="true"
            className={cx(styles.icon, styles.folderIcon)}
            size={16}
            stroke={1.6}
          />
        );
      }

      const FileIcon = CATEGORY_ICONS[row.file.category];

      return (
        <FileIcon
          aria-hidden="true"
          className={cx(
            styles.icon,
            (row.file.category === 'video' || row.file.category === 'image') &&
              styles.mediaIcon,
          )}
          size={16}
          stroke={1.6}
        />
      );
    };

    /** 一行的名称单元格：图标 + 名称；文件夹整块可点，应用名称可点打开，视频 / 图片名称可点预览 */
    const renderName = (row: FilesRow) => {
      const entry = entryOf(row);
      const content = (
        <>
          {renderIcon(row)}
          <FreeTruncatedText
            className={styles.name}
            disabled={tipsOff}
            ellipsis="middle"
            lines={1}
            text={entry.name}
          />
        </>
      );

      if (row.kind === 'folder') {
        const opening = listLoading && loadingFolder === row.folder.path;

        return (
          <UnstyledButton
            aria-label={`打开文件夹 ${row.folder.name}`}
            className={styles.nameButton}
            disabled={opening}
            onClick={(event) => {
              event.stopPropagation();
              onOpenFolder(row.folder.path);
            }}
            type="button"
          >
            {content}
            {opening ? (
              <Loader className={styles.openingSpinner} size={11} />
            ) : null}
          </UnstyledButton>
        );
      }

      if (row.kind === 'app') {
        return (
          <UnstyledButton
            aria-label={`打开 ${row.app.name}`}
            className={styles.nameButton}
            disabled={launchingApp === row.app.path}
            onClick={(event) => {
              event.stopPropagation();
              onOpenApp(row.app);
            }}
            type="button"
          >
            {content}
          </UnstyledButton>
        );
      }

      if (
        row.file.category === 'video' ||
        row.file.category === 'image'
      ) {
        const { category, name: fileName } = row.file;

        return (
          <UnstyledButton
            aria-label={`预览${FILE_CATEGORY_LABELS[category]} ${fileName}`}
            className={styles.nameButton}
            onClick={(event) => {
              event.stopPropagation();

              if (category === 'video') {
                onOpenVideo(row.file);
              } else {
                onOpenImage(row.file);
              }
            }}
            type="button"
          >
            {content}
          </UnstyledButton>
        );
      }

      return <div className={styles.nameCell}>{content}</div>;
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
          {rows.map((row) => {
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
                <FreeTable.Td>{renderName(row)}</FreeTable.Td>
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
          })}
        </FreeTable.Tbody>
      </FreeTable>
      </div>
    );
  },
);

export default FilesTable;
