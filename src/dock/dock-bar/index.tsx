/**
 * 程序坞条：悬浮贴边的亮色毛玻璃盒子、macOS 式指针距离放大与落点动画。
 *
 * 它只负责把「收起的窗口」摆出来并接收点击；打开 / 收起窗口的编排在 Provider 里。
 * 程序坞不向页面要空间：`fixed` 悬浮，页面在它下面正常铺满。
 */

import { useEffect, useRef } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';

import { cx } from '@/utils/cx';

import { DOCK_EDGE_GAP, DOCK_Z_INDEX } from '../constants';
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

/** 放大影响范围：以图标边长为基准，指针离得越远越接近原尺寸 */
const MAGNIFY_REACH_RATIO = 2.4;

/** 清掉指针放大写在节点上的临时变量 */
const resetMagnification = (box: HTMLElement | null) => {
  box?.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
    item.style.removeProperty('--dock-item-scale');
    item.style.removeProperty('z-index');
  });
};

const DockBar = () => {
  const {
    activeEntryId,
    entries,
    hideDock,
    restore,
    revealed,
    settings,
    showDock,
  } = useDock();
  const boxRef = useRef<HTMLDivElement>(null);
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
    zIndex: DOCK_Z_INDEX,
  } as CSSProperties;
  const iconSize = Math.max(20, Math.round(settings.itemSize * 0.62));

  const handleEnter = () => {
    clearHideTimer();

    if (settings.autoHide) {
      showDock();
    }
  };

  const handleLeave = () => {
    resetMagnification(boxRef.current);

    if (!settings.autoHide) {
      return;
    }

    clearHideTimer();
    hideTimer.current = window.setTimeout(hideDock, HIDE_DELAY);
  };

  /**
   * 指针距离放大（macOS 那一套）：只沿停靠轴算距离，越近越大。
   * 图标位置固定、只改缩放——如果同时把图标往远离指针的方向推，指针靠近时图标会一直躲，
   * 反而点不中；重叠交给 z-index 处理。
   * 直接写 CSS 变量，不走 React 状态，指针移动时不触发整条程序坞重渲染。
   */
  const handleMagnify = (event: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;

    if (box === null) {
      return;
    }

    const boxRect = box.getBoundingClientRect();
    const pointer = vertical
      ? event.clientY - boxRect.top
      : event.clientX - boxRect.left;
    const reach = Math.max(
      settings.itemSize * MAGNIFY_REACH_RATIO,
      settings.itemSize + 12,
    );
    const strength = settings.magnification - 1;

    box.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
      const center = vertical
        ? item.offsetTop + item.offsetHeight / 2
        : item.offsetLeft + item.offsetWidth / 2;
      const delta = center - pointer;
      const ratio = Math.max(0, 1 - Math.abs(delta) / reach);
      const scale = 1 + strength * ratio * ratio;

      item.style.setProperty('--dock-item-scale', String(scale));
      item.style.setProperty('z-index', String(Math.round(scale * 100)));
    });
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
      <div
        className={styles.dockBox}
        onPointerMove={handleMagnify}
        ref={boxRef}
      >
        {entries.map((entry) => {
          const Icon = DOCK_KIND_ICON[entry.kind];
          const active = activeEntryId === entry.id;

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
                aria-label={`${active ? '收起' : '打开'}「${entry.title}」`}
                aria-pressed={active}
                className={styles.dockItem}
                data-active={active ? 'true' : undefined}
                data-dock-item={entry.id}
                data-kind={entry.kind}
                onClick={() => restore(entry.id)}
              >
                <span className={styles.dockIcon}>
                  <Icon size={iconSize} stroke={1.55} />
                </span>
                {active ? <span aria-hidden="true" className={styles.dockDot} /> : null}
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
};

export default DockBar;
