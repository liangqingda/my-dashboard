/**
 * 右下角控制组：最下永远是展开 / 收起开关。
 * 其余按钮平时整颗压在开关正后方，指针进到这一列或聚焦到它，才沿槽位从开关背后弹出来。
 * 以后再加控件只往这一列里塞，槽位按距离开关从下往上排。
 */

import { Tooltip, UnstyledButton } from '@mantine/core';
import { IconApps, IconCheck, IconChevronDown, IconPencil } from '@tabler/icons-react';

import { DOCK_Z_INDEX } from '../../constants';

import type { DockControlsProps } from './types';

import styles from './index.scss';

const TOGGLE_ICON_SIZE = 18;
const EDIT_ICON_SIZE = 17;

/** 编辑按钮的槽位：开关之外的第一颗，再往上加就是 2、3 */
const EDIT_SLOT = 1;

const DockControls = ({
  count,
  dim,
  editing,
  empty,
  hidden,
  open,
  onEditToggle,
  onToggle,
}: DockControlsProps) => {
  let toggleLabel = '展开程序坞';

  if (empty) {
    toggleLabel = '还没有收起的窗口';
  } else if (open) {
    toggleLabel = '收起程序坞';
  }

  const ToggleIcon = open ? IconChevronDown : IconApps;

  return (
    <div
      className={styles.dockControls}
      data-controls-hidden={hidden ? 'true' : undefined}
      data-controls-pinned={editing ? 'true' : undefined}
      data-dock-dim={dim ? 'true' : undefined}
      style={{ zIndex: DOCK_Z_INDEX }}
    >
      {open ? (
        <Tooltip
          label={editing ? '完成编辑' : '编辑程序坞'}
          position="left"
          transitionProps={{ duration: 80 }}
          withArrow
        >
          <UnstyledButton
            aria-label={editing ? '完成编辑' : '编辑程序坞'}
            aria-pressed={editing}
            className={styles.dockControl}
            data-active={editing ? 'true' : undefined}
            data-stacked="true"
            onClick={onEditToggle}
            style={{ '--dock-control-slot': EDIT_SLOT }}
          >
            {editing ? (
              <IconCheck size={EDIT_ICON_SIZE} stroke={1.8} />
            ) : (
              <IconPencil size={EDIT_ICON_SIZE} stroke={1.8} />
            )}
          </UnstyledButton>
        </Tooltip>
      ) : null}
      <Tooltip
        label={toggleLabel}
        position="left"
        transitionProps={{ duration: 80 }}
        withArrow
      >
        <UnstyledButton
          aria-expanded={open}
          aria-label={empty ? '程序坞为空' : toggleLabel}
          className={styles.dockControl}
          data-dock-anchor="true"
          data-dock-toggle="true"
          disabled={empty}
          onClick={onToggle}
        >
          <ToggleIcon size={TOGGLE_ICON_SIZE} stroke={1.8} />
          {!open && !empty ? (
            <span aria-hidden="true" className={styles.dockToggleCount}>
              {count}
            </span>
          ) : null}
        </UnstyledButton>
      </Tooltip>
    </div>
  );
};

export default DockControls;
