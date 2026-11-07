import { IconChevronRight } from '@tabler/icons-react';

import type { EnglishNote } from '@/features/english-notes/types';

import styles from './index.scss';

export type NotesIndexProps = {
  /** 全部笔记 */
  notes: EnglishNote[];
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => void;
};

/** 把文件名拆成主名与扩展名，扩展名弱化展示。 */
const splitName = (name: string): { base: string; extension: string } => {
  const index = name.lastIndexOf('.');

  if (index <= 0) {
    return { base: name, extension: '' };
  }

  return { base: name.slice(0, index), extension: name.slice(index) };
};

/** 笔记索引：默认只露出文件名，点击打开预览。 */
const NotesIndex = ({ notes, onOpen }: NotesIndexProps) => (
  <ul className={styles.list}>
    {notes.map((note) => {
      const { base, extension } = splitName(note.name);

      return (
        <li className={styles.row} key={note.name}>
          <button
            aria-label={`预览 ${note.name}`}
            className={styles.item}
            onClick={() => onOpen(note.name)}
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
);

export default NotesIndex;
