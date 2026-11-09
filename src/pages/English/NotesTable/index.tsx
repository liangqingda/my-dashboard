import { UnstyledButton } from '@mantine/core';

import CopyIconButton from '@/components/CopyIconButton';
import FreeTable from '@/components/FreeTable';
import { cx } from '@/utils/cx';

import { EMPTY_CELL } from '../constants';
import NotesPlaceholder from '../NotesPlaceholder';
import type { NoteSortKey, NotesSort } from '../types';
import { getNoteRelativePath } from '../utils/notes';

import type { NotesTableProps } from './types';
import SortHeader from './SortHeader';

import styles from './index.scss';

/** 当前排序落到 aria-sort 的取值；未激活的列是 none */
const ariaSortOf = (
  sort: NotesSort,
  key: NoteSortKey,
): 'ascending' | 'descending' | 'none' => {
  if (sort.key !== key) {
    return 'none';
  }

  return sort.direction === 'asc' ? 'ascending' : 'descending';
};

/**
 * 表格平铺：一行一篇笔记，分类（错题 / 短语 / 用法 / 语法 / 词汇）只是
 * 「分类」单元格的内容，不再当列标题。分类与更新时间两列标题可点击切换排序。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 */
const NotesTable = ({
  rows,
  loading,
  error,
  onOpen,
  onSort,
  sort,
}: NotesTableProps) => {
  /** 首次读取还没有行，先不报 0，避免「笔记 (0)」这种误导 */
  const showCount = !(loading && rows.length === 0);

  return (
    <div className={styles.wrap}>
      <FreeTable tabularNums>
        <FreeTable.Thead>
          <FreeTable.Tr>
            <FreeTable.Th scope="col">
              笔记
              {showCount ? (
                <span className={styles.count}>({rows.length})</span>
              ) : null}
            </FreeTable.Th>
            <FreeTable.Th scope="col">目标知识点</FreeTable.Th>
            <FreeTable.Th
              aria-sort={ariaSortOf(sort, 'category')}
              className={styles.categoryWidth}
              scope="col"
            >
              <SortHeader
                label="分类"
                onSort={onSort}
                sort={sort}
                sortKey="category"
              />
            </FreeTable.Th>
            <FreeTable.Th
              aria-sort={ariaSortOf(sort, 'updated')}
              className={styles.timeWidth}
              scope="col"
            >
              <SortHeader
                label="更新时间"
                onSort={onSort}
                sort={sort}
                sortKey="updated"
              />
            </FreeTable.Th>
            <FreeTable.Th className={styles.actionWidth} scope="col">
              操作
            </FreeTable.Th>
          </FreeTable.Tr>
        </FreeTable.Thead>
        <FreeTable.Tbody>
          {rows.length > 0 ? (
            rows.map((row) => {
              /** 整行都是打开入口；文件名按钮自己 stopPropagation，避免点它时触发两次 */
              const open = () => {
                void onOpen(row.note.name);
              };

              return (
                <FreeTable.Tr
                  className={styles.row}
                  key={row.note.name}
                  onClick={open}
                >
                  <FreeTable.Td>
                    <UnstyledButton
                      aria-label={`预览 ${row.note.name}`}
                      className={styles.name}
                      onClick={(event) => {
                        event.stopPropagation();
                        open();
                      }}
                      type="button"
                    >
                      {row.note.name}
                    </UnstyledButton>
                  </FreeTable.Td>
                  <FreeTable.Td className={styles.topic}>
                    {row.topicLabel || EMPTY_CELL}
                  </FreeTable.Td>
                  <FreeTable.Td className={styles.categoryWidth}>
                    <span className={styles.category}>{row.categoryLabel}</span>
                  </FreeTable.Td>
                  <FreeTable.Td className={cx(styles.timeWidth, styles.time)}>
                    {row.updatedLabel || EMPTY_CELL}
                  </FreeTable.Td>
                  <FreeTable.Td className={styles.actionWidth}>
                    <CopyIconButton
                      className={styles.actionButton}
                      label="复制相对路径"
                      text={getNoteRelativePath(row.note.name)}
                    />
                  </FreeTable.Td>
                </FreeTable.Tr>
              );
            })
          ) : (
            <FreeTable.Tr>
              <FreeTable.Td colSpan={5}>
                <NotesPlaceholder
                  error={error}
                  loading={loading}
                  total={rows.length}
                />
              </FreeTable.Td>
            </FreeTable.Tr>
          )}
        </FreeTable.Tbody>
      </FreeTable>
    </div>
  );
};

export default NotesTable;
