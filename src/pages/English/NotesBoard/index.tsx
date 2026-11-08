import { Skeleton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import { NOTE_CATEGORIES } from '@/pages/English/constants';
import type { EnglishNote } from '@/pages/English/types';
import {
  getColumnNotes,
  splitNoteName,
  stripCategoryPrefix,
} from '@/pages/English/utils';

import styles from './index.scss';

export type NotesBoardProps = {
  /** 全部笔记 */
  notes: EnglishNote[];
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因；有错误时不出「还没有笔记」的空态 */
  error: string | null;
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => Promise<void>;
};

/** 分列看板：一类一列，列内独立滚动，默认只露出文件名。 */
const NotesBoard = ({ notes, loading, error, onOpen }: NotesBoardProps) => (
  <div className={styles.board}>
    {NOTE_CATEGORIES.map((category) => {
      const columnNotes = getColumnNotes(notes, category.key);
      /** 读取失败时列表本来可能是空，不能把「空目录」当成结论 */
      const canClaimEmpty = !loading && error === null;

      return (
        <section className={styles.column} key={category.key}>
          <h3 className={styles.columnTitle}>{category.label}</h3>
          <div className={styles.columnBody}>
            {loading && notes.length === 0 ? (
              <Skeleton h={14} mt={8} w="64%" />
            ) : null}

            {canClaimEmpty && notes.length > 0 && columnNotes.length === 0 ? (
              <p className={styles.empty}>这一列还没有笔记</p>
            ) : null}

            {canClaimEmpty && notes.length === 0 ? (
              <p className={styles.empty}>笔记目录里还没有 Markdown 文件</p>
            ) : null}

            {columnNotes.length > 0 ? (
              <ul className={styles.list}>
                {columnNotes.map((note) => {
                  const { base, extension } = splitNoteName(note.name);
                  const display = stripCategoryPrefix(base, category.key);

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
                          {display}
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
