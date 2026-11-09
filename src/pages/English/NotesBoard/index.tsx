import NotesPlaceholder from '../NotesPlaceholder';

import type { NotesBoardProps } from './types';
import NoteItem from './NoteItem';

import styles from './index.scss';

/** 分列看板：一类一列，列内独立滚动，默认只露出文件名。 */
const NotesBoard = ({ columns, loading, error, onOpen }: NotesBoardProps) => {
  /** 板上真正展示的笔记数：0 才说明整目录为空 */
  const total = columns.reduce((sum, column) => sum + column.notes.length, 0);
  /** 首次读取还没数据，先不报 0，避免「错题 (0)」这种误导 */
  const showCount = !(loading && total === 0);

  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <section className={styles.column} key={column.key}>
          <h3 className={styles.columnTitle}>
            {column.label}
            {showCount ? (
              <span className={styles.columnCount}>({column.notes.length})</span>
            ) : null}
          </h3>
          <div className={styles.columnBody}>
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
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
};

export default NotesBoard;
