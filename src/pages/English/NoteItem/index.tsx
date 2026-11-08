import { IconChevronRight } from '@tabler/icons-react';

import {
  formatNoteUpdatedAt,
  splitNoteName,
  stripCategoryPrefix,
} from '../utils/notes';

import type { NoteItemProps } from './types';

import styles from './index.scss';

/**
 * 列表里的一行：只露文件名（去掉重复的分类前缀），点击打开预览。
 * 表格平铺视图额外显示「笔记更新时间」，分列看板里文件名本身就是主信息，不显示。
 */
const NoteItem = ({
  note,
  category,
  onOpen,
  showUpdated = false,
}: NoteItemProps) => {
  const { base, extension } = splitNoteName(note.name);
  const display = stripCategoryPrefix(base, category);
  const updated = showUpdated ? formatNoteUpdatedAt(note) : '';

  return (
    <li className={styles.row}>
      <button
        aria-label={`预览 ${note.name}`}
        className={styles.item}
        onClick={() => {
          void onOpen(note.name);
        }}
        type="button"
      >
        <span className={styles.text}>
          <span className={styles.name}>
            {display}
            <span className={styles.extension}>{extension}</span>
          </span>
          {updated ? <span className={styles.updated}>{updated}</span> : null}
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
};

export default NoteItem;
