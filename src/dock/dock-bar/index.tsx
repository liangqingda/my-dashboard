/**
 * 程序坞条：贴边停靠、毛玻璃盒子、图标 hover 放大与落点动画。
 *
 * 它只负责把「收起的窗口」摆出来并接收点击；打开 / 收起窗口的编排在 Provider 里，
 * 页面让位靠 `BasicLayout` 读 `reservedThickness`，这里不碰布局。
 */

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import { cx } from '@/utils/cx';

import { DOCK_EDGE_GAP, DOCK_NEIGHBOR_SCALE_RATIO, DOCK_Z_INDEX } from '../constants';
import { useDock } from '../hooks/useDock';
import type { DockPlacement } from '../types';

import { DOCK_KIND_ICON } from './constants';

import styles from './index.scss';

/** 图标 tip 往屏幕内侧弹，别被屏幕边缘裁掉 */
const TIP_POSITION: Record<DockPlacement, 'left' | 'right' | 'top' | 'bottom'> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

/** 自动隐藏时，指针离开盒子后留一点缓冲再收（从图标移到 tip 上不算离开） */
const HIDE_DELAY = 500;

const DockBar = () => {
  const {
    entries,
    hideDock,
    restore,
    revealed,
    settings,
    showDock,
  } = useDock();
  const hideTimer = useRef<number | undefined>(undefined);

  const clearHideTimer = () => {
    if (hideTimer.current !== undefined) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  };

  useEffect(() => clearHideTimer, []);

  if (entries.length === 0) {
    return null;
  }

  const vertical = settings.placement === 'left' || settings.placement === 'right';
  const visible = !settings.autoHide || revealed;
  const dockStyle = {
    '--dock-gap': `${DOCK_EDGE_GAP}px`,
    '--dock-item-size': `${settings.itemSize}px`,
    '--dock-magnify': settings.magnification,
    '--dock-neighbor-scale': DOCK_NEIGHBOR_SCALE_RATIO,
    zIndex: DOCK_Z_INDEX,
  } as CSSProperties;
  const iconSize = Math.max(20, Math.round(settings.itemSize * 0.56));

  const handleEnter = () => {
    clearHideTimer();

    if (settings.autoHide) {
      showDock();
    }
  };

  const handleLeave = () => {
    if (!settings.autoHide) {
      return;
    }

    clearHideTimer();
    hideTimer.current = window.setTimeout(hideDock, HIDE_DELAY);
  };

  return (
    <aside
      aria-label="已收起的窗口"
      className={cx(
        styles.dock,
        styles[settings.placement],
        vertical ? styles.vertical : styles.horizontal,
        visible ? styles.visible : styles.hidden,
      )}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      style={dockStyle}
    >
      <div className={styles.dockBox}>
        {entries.map((entry) => {
          const Icon = DOCK_KIND_ICON[entry.kind];

          return (
            <Tooltip
              key={entry.id}
              label={entry.title}
              position={TIP_POSITION[settings.placement]}
              transitionProps={{ duration: 80 }}
              withArrow
              withinPortal
              zIndex={DOCK_Z_INDEX + 60}
            >
              <UnstyledButton
                aria-label={`打开「${entry.title}」`}
                className={styles.dockItem}
                data-dock-item={entry.id}
                onClick={() => restore(entry.id)}
              >
                <span className={styles.dockIcon}>
                  <Icon size={iconSize} stroke={1.6} />
                </span>
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
};

export default DockBar;
