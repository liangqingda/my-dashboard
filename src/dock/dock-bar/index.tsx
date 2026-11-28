/**
 * 程序坞条：底部悬浮的亮色毛玻璃盒子，macOS 式指针距离放大。
 *
 * 默认收起，由右下角那颗 `IconApps` 按钮从下方滑出 / 收起；收进新窗口时自动展开一次。
 * 同一类窗口按种类分组摆在一起，组间画一道细线。打开 / 收起窗口的编排仍在 Provider 里。
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';
import { IconApps, IconChevronDown } from '@tabler/icons-react';

import {
  DOCK_EDGE_GAP,
  DOCK_ITEM_SIZE,
  DOCK_MAGNIFICATION,
  DOCK_Z_INDEX,
} from '../constants';
import { useDock } from '../hooks/useDock';
import { groupDockEntries } from '../utils/dock-groups';

import { DOCK_KIND_ICON } from './constants';

import styles from './index.scss';

/** 放大影响范围：以图标边长为基准，指针离得越远越接近原尺寸 */
const MAGNIFY_REACH_RATIO = 2.4;

const TOGGLE_ICON_SIZE = 18;

/** 清掉指针放大写在节点上的临时变量 */
const resetMagnification = (box: HTMLElement | null) => {
  box?.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
    item.style.removeProperty('--dock-item-scale');
    item.style.removeProperty('z-index');
  });
};

const DockBar = () => {
  const { activeEntryId, entries, receivingIds, restore } = useDock();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const empty = entries.length === 0;
  const showing = open && !empty;
  const groups = groupDockEntries(entries);
  const reach = DOCK_ITEM_SIZE * MAGNIFY_REACH_RATIO;
  const strength = DOCK_MAGNIFICATION - 1;
  const iconSize = Math.max(20, Math.round(DOCK_ITEM_SIZE * 0.62));
  const dockStyle = {
    '--dock-gap': `${DOCK_EDGE_GAP}px`,
    '--dock-item-size': `${DOCK_ITEM_SIZE}px`,
    zIndex: DOCK_Z_INDEX,
  } as CSSProperties;

  /*
   * 收进新窗口时要先看得见虚位：下一帧自动展开，并用无过渡的一帧把落点摆稳，再让克隆飞过去。
   * 延后一帧是为了不把「渲染中同步改状态」当成一条连锁更新。
   */
  useEffect(() => {
    if (receivingIds.length === 0) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setInstant(true);
      setOpen(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [receivingIds.length]);

  useEffect(() => {
    if (!instant) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => setInstant(false));

    return () => window.cancelAnimationFrame(frame);
  }, [instant]);

  /**
   * 指针距离放大：只沿底部横轴算距离，越近越大；位置固定不躲指针，重叠交给 z-index。
   * 直接写 CSS 变量，不走 React 状态，指针移动时不触发整条程序坞重渲染。
   */
  const handleMagnify = (event: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;

    if (box === null) {
      return;
    }

    const boxRect = box.getBoundingClientRect();
    const pointer = event.clientX - boxRect.left;

    box.querySelectorAll<HTMLElement>('[data-dock-item]').forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const center = itemRect.left + itemRect.width / 2 - boxRect.left;
      const delta = center - pointer;
      const ratio = Math.max(0, 1 - Math.abs(delta) / reach);
      const scale = 1 + strength * ratio * ratio;

      item.style.setProperty('--dock-item-scale', String(scale));
      item.style.setProperty('z-index', String(Math.round(scale * 100)));
    });
  };

  let toggleLabel = '展开程序坞';

  if (empty) {
    toggleLabel = '还没有收起的窗口';
  } else if (showing) {
    toggleLabel = '收起程序坞';
  }

  const ToggleIcon = showing ? IconChevronDown : IconApps;

  return (
    <>
      <aside
        aria-hidden={showing ? undefined : 'true'}
        aria-label="已收起的窗口"
        className={styles.dock}
        data-dock-open={showing ? 'true' : 'false'}
        data-instant={instant ? 'true' : undefined}
        data-open={showing ? 'true' : 'false'}
        onPointerLeave={() => resetMagnification(boxRef.current)}
        style={dockStyle}
      >
        <div className={styles.dockBox} onPointerMove={handleMagnify} ref={boxRef}>
          {groups.map((group, groupIndex) => (
            <Fragment key={group.kind}>
              {groupIndex > 0 ? (
                <span aria-hidden="true" className={styles.dockSeparator} />
              ) : null}
              {group.entries.map((entry) => {
                const Icon = DOCK_KIND_ICON[entry.kind];
                const active = activeEntryId === entry.id;
                const receiving = receivingIds.includes(entry.id);

                return (
                  <Tooltip
                    key={entry.id}
                    label={entry.title}
                    position="top"
                    transitionProps={{ duration: 80 }}
                    withArrow
                    withinPortal
                  >
                    <UnstyledButton
                      aria-label={`${active ? '收起' : '打开'}「${entry.title}」`}
                      aria-pressed={active}
                      className={styles.dockItem}
                      data-active={active ? 'true' : undefined}
                      data-dock-item={entry.id}
                      data-kind={entry.kind}
                      data-receiving={receiving ? 'true' : undefined}
                      disabled={receiving}
                      onClick={() => restore(entry.id)}
                    >
                      <span className={styles.dockIcon}>
                        <Icon size={iconSize} stroke={1.55} />
                      </span>
                      {active && !receiving ? (
                        <span aria-hidden="true" className={styles.dockDot} />
                      ) : null}
                    </UnstyledButton>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </aside>

      <Tooltip
        label={toggleLabel}
        position="left"
        transitionProps={{ duration: 80 }}
        withArrow
      >
        <UnstyledButton
          aria-expanded={showing}
          aria-label={empty ? '程序坞为空' : toggleLabel}
          className={styles.dockToggle}
          data-dock-toggle="true"
          data-open={showing ? 'true' : undefined}
          disabled={empty}
          onClick={() => setOpen((current) => !current)}
          style={{ zIndex: DOCK_Z_INDEX }}
        >
          <ToggleIcon size={TOGGLE_ICON_SIZE} stroke={1.8} />
          {!showing && !empty ? (
            <span aria-hidden="true" className={styles.dockToggleCount}>
              {entries.length}
            </span>
          ) : null}
        </UnstyledButton>
      </Tooltip>
    </>
  );
};

export default DockBar;
