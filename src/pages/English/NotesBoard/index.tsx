import { Skeleton } from '@mantine/core';

import type { NotesBoardProps } from './types';
import NoteItem from './NoteItem';

import styles from './index.scss';

/** 分列看板：一类一列，列内独立滚动，默认只露出文件名。 */
const NotesBoard = ({ columns, loading, error, onOpen }: NotesBoardProps) => {
  /** 读取失败时列表本来可能是空，不能把「空目录」当成结论 */
  const canClaimEmpty = !loading && error === null;
  /** 板上真正展示的笔记数：0 才说明整目录为空 */
  const total = columns.reduce((sum, column) => sum + column.notes.length, 0);

  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <section className={styles.column} key={column.key}>
          <h3 className={styles.columnTitle}>{column.label}</h3>
          <div className={styles.columnBody}>
            {loading && total === 0 ? <Skeleton h={14} mt={8} w="64%" /> : null}

            {canClaimEmpty && total > 0 && column.notes.length === 0 ? (
              <p className={styles.empty}>这一列还没有笔记</p>
            ) : null}

            {canClaimEmpty && total === 0 ? (
              <p className={styles.empty}>笔记目录里还没有 Markdown 文件</p>
            ) : null}

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
