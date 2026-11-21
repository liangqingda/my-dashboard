import { Skeleton } from '@mantine/core';

import type { NotesPlaceholderProps } from './types';

import styles from './index.scss';

/**
 * 列表的加载 / 空态占位：分列看板与表格平铺共用同一套判定与文案，
 * 保证两种形式对「整目录为空」「这一列为空」的说法一致。
 * 读取失败时不出空态——列表空可能是失败的结果，不能当成结论。
 */
const NotesPlaceholder = ({
  columnTotal,
  error,
  filtered = false,
  loading,
  total,
}: NotesPlaceholderProps) => {
  if (loading && total === 0) {
    return <Skeleton h={14} mt={8} w="64%" />;
  }

  if (loading || error !== null) {
    return null;
  }

  if (total === 0) {
    return (
      <p className={styles.empty}>
        {filtered ? '没有符合当前筛选条件的笔记' : '笔记目录里还没有 Markdown 文件'}
      </p>
    );
  }

  if (columnTotal === 0) {
    return (
      <p className={styles.empty}>
        {filtered ? '这一列没有符合条件的笔记' : '这一列还没有笔记'}
      </p>
    );
  }

  return null;
};

export default NotesPlaceholder;
