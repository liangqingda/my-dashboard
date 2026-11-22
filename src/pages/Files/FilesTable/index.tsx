/**
 * 目录表格：一行一个条目，三列「名称 / 类别 / 操作」，文件夹在前、文件在后。
 * 名称前带类型图标；文件夹行整行可点进入下一层，文件行没有打开行为（与网格一致）。
 * 行可拖拽，文件夹行是放置目标；重命名 / 删除走与瓦片同一组按钮。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 */

import type { DragEvent } from 'react';
import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconFolderFilled } from '@tabler/icons-react';

import FreeTable from '@/components/tables/FreeTable';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import EntryTileActions from '../EntryTileActions';
import { CATEGORY_ICONS, ENTRY_KIND_LABELS } from '../constants';
import type { FilesRow } from '../types';

import type { FilesTableProps } from './types';

import styles from './index.scss';

const FilesTable = memo(
  ({
    dragSource,
    dropTarget,
    onDragEnd,
    onDragLeaveFolder,
    onDragOverFolder,
    onDragStartEntry,
    onDropFolder,
    onEditEntry,
    onOpenFolder,
    onRequestDeleteEntry,
    rows,
  }: FilesTableProps) => {
    /** 一行的名称单元格：图标 + 名称；文件夹整块可点，文件的名称只是展示 */
    const renderName = (row: FilesRow) => {
      const entry = row.kind === 'folder' ? row.folder : row.file;
      const Icon =
        row.kind === 'folder'
          ? IconFolderFilled
          : CATEGORY_ICONS[row.file.category];
      const iconClass = cx(
        styles.icon,
        row.kind === 'folder' && styles.folderIcon,
        row.kind === 'file' && row.file.category === 'video' && styles.videoIcon,
      );

      const content = (
        <>
          <Icon
            aria-hidden="true"
            className={iconClass}
            size={16}
            stroke={1.6}
          />
          <FreeTruncatedText
            className={styles.name}
            ellipsis="middle"
            lines={1}
            text={entry.name}
          />
        </>
      );

      if (row.kind === 'folder') {
        return (
          <UnstyledButton
            aria-label={`打开文件夹 ${entry.name}`}
            className={styles.nameButton}
            onClick={(event) => {
              event.stopPropagation();
              onOpenFolder(entry.path);
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
            const entry = row.kind === 'folder' ? row.folder : row.file;
            const isFolder = row.kind === 'folder';
            const dragging = dragSource === entry.path;
            const dropActive = isFolder && dropTarget === entry.path;

            return (
              <FreeTable.Tr
                className={cx(
                  isFolder && styles.clickable,
                  dragging && styles.dragging,
                  dropActive && styles.dropActive,
                )}
                draggable
                key={entry.path}
                onClick={isFolder ? () => onOpenFolder(entry.path) : undefined}
                onDragEnd={onDragEnd}
                onDragLeave={isFolder ? onDragLeaveFolder : undefined}
                onDragOver={
                  isFolder
                    ? (event: DragEvent<HTMLTableRowElement>) =>
                        onDragOverFolder(entry.path, event)
                    : undefined
                }
                onDragStart={(event) => {
                  const { dataTransfer } = event;

                  dataTransfer.effectAllowed = 'move';
                  dataTransfer.setData('text/plain', entry.path);
                  onDragStartEntry(entry.path);
                }}
                onDrop={isFolder ? () => onDropFolder(entry.path) : undefined}
              >
                <FreeTable.Td>{renderName(row)}</FreeTable.Td>
                <FreeTable.Td className={styles.kindWidth}>
                  {ENTRY_KIND_LABELS[row.kind]}
                </FreeTable.Td>
                <FreeTable.Td className={styles.actionWidth}>
                  <EntryTileActions
                    className={styles.rowActions}
                    kind={row.kind}
                    onEdit={() => onEditEntry(entry)}
                    onRequestDelete={() => onRequestDeleteEntry(entry.path)}
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
