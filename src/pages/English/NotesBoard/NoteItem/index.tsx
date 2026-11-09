import { UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import { splitNoteName, stripCategoryPrefix } from '../../utils/notes';

import type { NoteItemProps } from './types';

import styles from './index.scss';

/**
 * 列表里的一行：只露文件名（去掉重复的分类前缀），点击打开预览。
 * 放不下时省略号截断；完整文件名靠「hover 某一列时这一列变宽」露出来，不再额外弹 tip。
 */
const NoteItem = ({ note, category, onOpen }: NoteItemProps) => {
  const { base, extension } = splitNoteName(note.name);
  const display = stripCategoryPrefix(base, category);
  /** 列表里露出的完整文件名（不含列标题已经写明的分类前缀） */
  const label = `${display}${extension}`;

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
        <span className={styles.name}>{label}</span>
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
