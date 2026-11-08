import { cx } from '@/utils/cx';

import NotesPlaceholder from '../NotesPlaceholder';

import type { NotesTableProps } from './types';

import styles from './index.scss';

/**
 * 表格平铺：一行一篇笔记，分类（错题 / 短语 / 用法 / 语法 / 词汇 / 混合）只是
 * 「分类」单元格的内容，不再当列标题；行按「笔记更新时间」倒序，整表一起滚动。
 */
const NotesTable = ({ rows, loading, error, onOpen }: NotesTableProps) => (
  <div className={styles.wrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.head} scope="col">
            笔记
          </th>
          <th className={cx(styles.head, styles.categoryWidth)} scope="col">
            分类
          </th>
          <th className={cx(styles.head, styles.timeWidth)} scope="col">
            更新时间
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <tr className={styles.row} key={row.note.name}>
              <td className={styles.cell}>
                <button
                  aria-label={`预览 ${row.note.name}`}
                  className={styles.name}
                  onClick={() => {
                    void onOpen(row.note.name);
                  }}
                  type="button"
                >
                  {row.note.name}
                </button>
              </td>
              <td className={cx(styles.cell, styles.categoryWidth)}>
                <span className={styles.category}>{row.categoryLabel}</span>
              </td>
              <td className={cx(styles.cell, styles.timeWidth, styles.time)}>
                {row.updatedLabel}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td className={styles.cell} colSpan={3}>
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
