import { cx } from '@/utils/cx';

import { EMPTY_CELL } from '../constants';
import NotesPlaceholder from '../NotesPlaceholder';
import type { NoteSortKey, NotesSort } from '../types';

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
 * 表格平铺：一行一篇笔记，分类（错题 / 短语 / 用法 / 语法 / 词汇 / 混合）只是
 * 「分类」单元格的内容，不再当列标题。分类与更新时间两列标题可点击切换排序。
 */
const NotesTable = ({
  rows,
  loading,
  error,
  onOpen,
  onSort,
  sort,
}: NotesTableProps) => (
  <div className={styles.wrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.head} scope="col">
            笔记
          </th>
          <th className={styles.head} scope="col">
            目标知识点
          </th>
          <th
            aria-sort={ariaSortOf(sort, 'category')}
            className={cx(styles.head, styles.categoryWidth)}
            scope="col"
          >
            <SortHeader
              label="分类"
              onSort={onSort}
              sort={sort}
              sortKey="category"
            />
          </th>
          <th
            aria-sort={ariaSortOf(sort, 'updated')}
            className={cx(styles.head, styles.timeWidth)}
            scope="col"
          >
            <SortHeader
              label="更新时间"
              onSort={onSort}
              sort={sort}
              sortKey="updated"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => {
            /** 整行都是打开入口；文件名按钮自己 stopPropagation，避免点它时触发两次 */
            const open = () => {
              void onOpen(row.note.name);
            };

            return (
              <tr className={styles.row} key={row.note.name} onClick={open}>
                <td className={styles.cell}>
                  <button
                    aria-label={`预览 ${row.note.name}`}
                    className={styles.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      open();
                    }}
                    type="button"
                  >
                    {row.note.name}
                  </button>
                </td>
                <td className={cx(styles.cell, styles.topic)}>
                  {row.topicLabel || EMPTY_CELL}
                </td>
                <td className={cx(styles.cell, styles.categoryWidth)}>
                  <span className={styles.category}>{row.categoryLabel}</span>
                </td>
                <td className={cx(styles.cell, styles.timeWidth, styles.time)}>
                  {row.updatedLabel || EMPTY_CELL}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td className={styles.cell} colSpan={4}>
              <NotesPlaceholder
                error={error}
                loading={loading}
                total={rows.length}
              />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default NotesTable;
