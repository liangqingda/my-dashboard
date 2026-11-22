import { memo } from 'react';
import { IconPencil, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import type { EntryTileActionsProps, EntryTileKind } from './types';

import styles from './index.scss';

/** 类型 → 按钮 tooltip 用的中文名词 */
const KIND_LABEL: Record<EntryTileKind, string> = {
  folder: '文件夹',
  file: '文件',
};

/**
 * 瓦片右上角浮出的重命名 / 删除按钮组；点击各自吞掉冒泡，避免触发瓦片本体的打开行为。
 * 显隐由瓦片外壳 hover 控制，本组件只负责按钮与定位排布。
 */
const EntryTileActions = memo(
  ({ kind, onEdit, onRequestDelete, className }: EntryTileActionsProps) => {
    const label = KIND_LABEL[kind];

    return (
      <div className={cx(styles.actions, className)}>
        <FreeIconAction
          label={`重命名${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          size="xs"
        >
          <IconPencil size={13} />
        </FreeIconAction>
        <FreeIconAction
          label={`删除${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          size="xs"
          tone="danger"
        >
          <IconTrash size={13} />
        </FreeIconAction>
      </div>
    );
  },
);

export default EntryTileActions;
