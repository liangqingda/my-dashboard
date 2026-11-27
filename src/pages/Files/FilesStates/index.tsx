/**
 * 列表区的三种「还没有内容」状态：读目录失败、首次 / 切目录加载中、空态与未选目录的引导。
 * 只负责按状态挑一档渲染，取数与判定都在页面里。
 */

import type { CSSProperties } from 'react';
import { Alert, Button, Group, Skeleton, Text } from '@mantine/core';

import { SKELETON_TILES } from '../constants';

import styles from './index.scss';

/** 列表状态的入参：四种状态互斥，页面只挑其中一种传 true */
export type FilesStatesProps = {
  /** 读目录失败的原因；null 表示没失败 */
  error: string | null;
  /** 首次 / 切目录还没拿到结果，按网格形状给骨架 */
  gridSkeleton: boolean;
  /** 同上，按表格形状给骨架 */
  tableSkeleton: boolean;
  /** 还没选过目录：引导先填路径 */
  prompt: boolean;
  /** 网格瓦片宽度（px）：骨架列宽与真实网格同一档 */
  tileWidth: number;
  /** 失败后重试 */
  onRetry: () => void;
};

const FilesStates = ({
  error,
  gridSkeleton,
  onRetry,
  prompt,
  tableSkeleton,
  tileWidth,
}: FilesStatesProps) => (
  <>
    {error !== null ? (
      <Alert color="red" title="读取目录失败">
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <Text size="xs">{error}</Text>
          <Button onClick={onRetry} size="xs" variant="light">
            重试
          </Button>
        </Group>
      </Alert>
    ) : null}

    {gridSkeleton ? (
      <div
        className={styles.gridSkeleton}
        style={{ '--tile-width': `${tileWidth}px` } as CSSProperties}
      >
        {SKELETON_TILES.map((tile) => (
          <Skeleton height={112} key={tile} />
        ))}
      </div>
    ) : null}

    {tableSkeleton ? <Skeleton height={220} /> : null}

    {prompt ? (
      <Text className={styles.empty} size="sm">
        点「打开」选择要浏览的本地目录，或从收藏目录进入
      </Text>
    ) : null}
  </>
);

export default FilesStates;
