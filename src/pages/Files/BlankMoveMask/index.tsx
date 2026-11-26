/**
 * 直接拖模式下松手在**空白处**＝搬进当前这一层：这里没有哪一格文件夹可以挂进度，
 * 所以盖一层全屏遮罩，中间一枚进度卡，把「正在搬、搬到哪一条」说清楚。
 *
 * 只在搬家期间出现：遮罩同时挡住底层列表的点击与拖拽，免得进度跑着的时候又被点开别的东西。
 * 落点在某个文件夹时不用它——那种进度画在目标文件夹那一格上（`FolderTile` / `FilesTable` 行内）。
 */

import { Loader, Progress, Text } from '@mantine/core';

import type { BlankMoveMaskProps } from './types';

import styles from './index.scss';

const BlankMoveMask = ({ done, total }: BlankMoveMaskProps) => (
  <div aria-live="polite" className={styles.mask} role="status">
    <div className={styles.card}>
      <div className={styles.head}>
        <Loader size="sm" type="oval" />
        <Text className={styles.title} size="sm">
          正在移入当前目录
        </Text>
      </div>
      <Progress
        className={styles.bar}
        radius="xl"
        size={6}
        striped={total > 0}
        value={total === 0 ? 0 : (done / total) * 100}
      />
      <Text c="dimmed" size="xs">
        {done} / {total}
      </Text>
    </div>
  </div>
);

export default BlankMoveMask;
