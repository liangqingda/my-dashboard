import { UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import TruncatedText from '@/components/TruncatedText';

import { splitNoteName, stripCategoryPrefix } from '../../utils/notes';

import type { NoteItemProps } from './types';

import styles from './index.scss';

/**
 * 列表里的一行：只露文件名（去掉重复的分类前缀），点击打开预览。
 * 列宽放不下文件名时的省略号与「hover 出 tip 展示完整文件名」交给公共组件 TruncatedText。
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
        <TruncatedText className={styles.name} position="top" text={label} />
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
