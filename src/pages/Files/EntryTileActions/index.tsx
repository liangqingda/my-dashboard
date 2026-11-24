/**
 * 瓦片右上角浮出的操作按钮组：文件夹 / 文件是重命名 + 删除，应用只有卸载一项。
 * 用文字按钮而不是图标按钮——缩略图上盖着的玻璃层偏亮，13px 的线性图标压不住；
 * 尺寸取按钮组件最小一档（`compact-xs`）。点击各自吞掉冒泡，避免触发瓦片本体的打开行为。
 * 显隐由瓦片外壳 hover 控制，本组件只负责按钮与定位排布（表格视图传自己的定位类，让按钮常态可见）。
 */

import { memo } from 'react';
import { Button } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { EntryTileActionsProps } from './types';

import styles from './index.scss';

const EntryTileActions = memo(
  ({ kind, onEdit, onRequestDelete, className }: EntryTileActionsProps) => {
    const deleteLabel = kind === 'app' ? '卸载' : '删除';

    return (
      <div className={cx(styles.actions, className)}>
        {onEdit ? (
          <Button
            className={styles.button}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            size="compact-xs"
            variant="default"
          >
            重命名
          </Button>
        ) : null}
        <Button
          className={styles.button}
          color="red"
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          size="compact-xs"
          variant="light"
        >
          {deleteLabel}
        </Button>
      </div>
    );
  },
);

export default EntryTileActions;
