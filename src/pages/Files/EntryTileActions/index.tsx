import { memo } from 'react';
import { IconPencil, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import { ENTRY_KIND_LABELS } from '../constants';

import type { EntryTileActionsProps } from './types';

import styles from './index.scss';

/**
 * 瓦片右上角浮出的重命名 / 删除按钮组；点击各自吞掉冒泡，避免触发瓦片本体的打开行为。
 * 显隐由瓦片外壳 hover 控制，本组件只负责按钮与定位排布（表格视图传自己的定位类，让按钮常态可见）。
 */
const EntryTileActions = memo(
  ({ kind, onEdit, onRequestDelete, className }: EntryTileActionsProps) => {
    const label = ENTRY_KIND_LABELS[kind];

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
