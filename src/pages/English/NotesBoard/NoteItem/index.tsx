import { UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import { splitNoteName, stripCategoryPrefix } from '../../utils/notes';

import type { NoteItemProps } from './types';

import styles from './index.scss';

/** 列表里的一行：只露文件名（去掉重复的分类前缀），点击打开预览 */
const NoteItem = ({ note, category, onOpen }: NoteItemProps) => {
  const { base, extension } = splitNoteName(note.name);
  const display = stripCategoryPrefix(base, category);

  return (
    <li className={styles.row}>
      <UnstyledButton
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
      </UnstyledButton>
    </li>
  );
};

export default NoteItem;
