/**
 * 目录表格：一行一个条目，三列「名称 / 类别 / 操作」，文件夹在前、应用其次、文件在后。
 * 名称前带类型图标（应用是真实图标，取不到时回落通用图标）；文件夹行整行可点进入下一层，
 * 视频 / 图片名称可点打开对应的预览弹窗，应用名称可点交给系统打开（与网格一致）；
 * 指针停到视频行上时先预取文件头，点开时首帧更快。
 * 行可拖拽（应用除外，移动 .app 会破坏系统登记），文件夹行是放置目标；
 * 重命名 / 删除走与瓦片同一组按钮，应用只有卸载一项。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 */

import type { DragEvent } from 'react';
import { memo } from 'react';
import { Loader, UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTable from '@/components/tables/FreeTable';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import AppIcon from '../AppIcon';
import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS, ENTRY_KIND_LABELS, FILE_CATEGORY_LABELS } from '../constants';
import type { AppEntry, FileEntry, FilesRow, FolderEntry } from '../types';
import { writeDragPayload } from '../utils/drag-image';
import { prefetchVideoHead } from '../utils/video-prefetch';

import type { FilesTableProps } from './types';

import styles from './index.scss';

/** 一行对应的条目：三种形态共用名称列与操作列 */
const entryOf = (row: FilesRow): AppEntry | FileEntry | FolderEntry => {
  switch (row.kind) {
    case 'folder':
      return row.folder;
    case 'app':
      return row.app;
    case 'file':
      return row.file;
  }
};

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
    rows,
    tipsOff,
  }: FilesTableProps) => {
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
      <FreeTable className={styles.tableFrame} layout="fixed">
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
                )}
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
    );
  },
);

export default FilesTable;
