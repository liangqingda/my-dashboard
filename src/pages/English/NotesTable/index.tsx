import NoteItem from '../NoteItem';
import NotesPlaceholder from '../NotesPlaceholder';

import type { NotesTableProps } from './types';

import styles from './index.scss';

/**
 * 表格平铺：六类各占一列，所有笔记平铺在同一张表里一起滚动（不做按列独立滚动）。
 * 每篇额外显示「笔记更新时间」，因为顺序就是按它倒序排的。
 */
const NotesTable = ({ columns, loading, error, onOpen }: NotesTableProps) => {
  /** 板上真正展示的笔记数：0 才说明整目录为空 */
  const total = columns.reduce((sum, column) => sum + column.notes.length, 0);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={styles.head} key={column.key} scope="col">
                <span className={styles.label}>{column.label}</span>
                <span className={styles.count}>{column.notes.length}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((column) => (
              <td className={styles.cell} key={column.key}>
                <NotesPlaceholder
                  columnTotal={column.notes.length}
                  error={error}
                  loading={loading}
                  total={total}
                />

                {column.notes.length > 0 ? (
                  <ul className={styles.list}>
                    {column.notes.map((note) => (
                      <NoteItem
                        category={column.key}
                        key={note.name}
                        note={note}
                        onOpen={onOpen}
                        showUpdated
                      />
                    ))}
                  </ul>
                ) : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default NotesTable;
