import { UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

import CopyIconButton from '@/components/CopyIconButton';

import {
  getNoteRelativePath,
  splitNoteName,
  stripCategoryPrefix,
} from '../../utils/notes';

import type { NoteItemProps } from './types';

import styles from './index.scss';

/**
 * 列表里的一行：只露文件名（去掉重复的分类前缀），点击打开预览。
 * 放不下时省略号截断；完整文件名靠「hover 某一列时这一列变宽」露出来，不再额外弹 tip。
 * 行右侧的复制图标与表格形式一致，复制的是同一条相对路径；只在悬停 / 聚焦这一行时浮现，
 * 平时把宽度让给文件名。
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
      {/* 复制按钮是打开按钮的兄弟节点：按钮不能嵌套按钮，点击也不会冒泡去开预览 */}
      <CopyIconButton
        className={styles.copy}
        iconSize={14}
        label="复制相对路径"
        text={getNoteRelativePath(note.name)}
      />
    </li>
  );
};

export default NoteItem;
