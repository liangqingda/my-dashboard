import { Skeleton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import { NOTE_CATEGORIES } from '@/features/english-notes/constants';
import type { EnglishNote } from '@/features/english-notes/types';
import { getNoteCategory } from '@/features/english-notes/utils';

import styles from './index.scss';

export type NotesBoardProps = {
  /** 全部笔记 */
  notes: EnglishNote[];
  /** 是否正在读取 */
  loading: boolean;
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => Promise<void>;
};

/** 把文件名拆成主名与扩展名，扩展名弱化展示。 */
const splitName = (name: string): { base: string; extension: string } => {
  const index = name.lastIndexOf('.');

  if (index <= 0) {
    return { base: name, extension: '' };
  }

  return { base: name.slice(0, index), extension: name.slice(index) };
};

/** 分列看板：一类一列，列内独立滚动，默认只露出文件名。 */
const NotesBoard = ({ notes, loading, onOpen }: NotesBoardProps) => (
  <div className={styles.board}>
    {NOTE_CATEGORIES.map((category) => {
      // 列内按文件名排序：保存会刷新修改时间，按时间排会让笔记在列里乱跳
      const columnNotes = notes
        .filter((note) => getNoteCategory(note.name) === category.key)
        .toSorted((a, b) => a.name.localeCompare(b.name));

      return (
        <section className={styles.column} key={category.key}>
          <h3 className={styles.columnTitle}>{category.label}</h3>
          <div className={styles.columnBody}>
            {loading && notes.length === 0 ? (
              <Skeleton h={14} mt={8} w="64%" />
            ) : null}

            {!loading && notes.length > 0 && columnNotes.length === 0 ? (
              <p className={styles.empty}>这一列还没有笔记</p>
            ) : null}

            {notes.length === 0 && !loading ? (
              <p className={styles.empty}>笔记目录里还没有 Markdown 文件</p>
            ) : null}

            {columnNotes.length > 0 ? (
              <ul className={styles.list}>
                {columnNotes.map((note) => {
                  const { base, extension } = splitName(note.name);

                  return (
                    <li className={styles.row} key={note.name}>
                      <button
                        aria-label={`预览 ${note.name}`}
                        className={styles.item}
                        onClick={() => {
                          void onOpen(note.name);
                        }}
                        type="button"
                      >
                        <span className={styles.name}>
                          {base}
                          <span className={styles.extension}>{extension}</span>
                        </span>
                        <IconChevronRight
                          aria-hidden="true"
                          className={styles.chevron}
                          size={14}
                          stroke={1.8}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </section>
      );
    })}
  </div>
);

export default NotesBoard;
