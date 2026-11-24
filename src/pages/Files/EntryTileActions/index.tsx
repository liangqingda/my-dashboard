/**
 * 瓦片右上角浮出的操作按钮组：文件夹 / 文件是重命名 + 删除，应用只有卸载一项。
 * 用图标按钮（`lg` 档 + 18px 图标，压在缩略图上要够大才点得准），整组坐在一层玻璃底片上：
 * 缩略图有亮有暗，图标直接压上去会飘，垫一层随主题变的半透明底片才稳。
 * 点击各自吞掉冒泡，避免触发瓦片本体的打开行为。
 * 显隐由瓦片外壳 hover 控制，本组件只负责按钮与定位排布（表格视图传自己的定位类，让按钮常态可见）。
 */

import { memo } from 'react';
import { IconPencil, IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import { ENTRY_KIND_LABELS } from '../constants';

import type { EntryTileActionsProps } from './types';

import styles from './index.scss';

/** 浮层按钮里的图标尺寸：跟着 `sm` 档按钮走 */
const ACTION_ICON_SIZE = 18;

const EntryTileActions = memo(
  ({ kind, onEdit, onRequestDelete, className }: EntryTileActionsProps) => {
    const label = ENTRY_KIND_LABELS[kind];

    return (
      <div className={cx(styles.actions, className)}>
        {onEdit ? (
          <FreeIconAction
            label={`重命名${label}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            size="lg"
          >
            <IconPencil size={ACTION_ICON_SIZE} />
          </FreeIconAction>
        ) : null}
        <FreeIconAction
          label={kind === 'app' ? '卸载应用' : `删除${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          size="lg"
          tone="danger"
        >
          <IconTrash size={ACTION_ICON_SIZE} />
        </FreeIconAction>
      </div>
    );
  },
);

export default EntryTileActions;
