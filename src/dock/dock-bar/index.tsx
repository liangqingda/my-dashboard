/**
 * 程序坞条：底部悬浮的亮色毛玻璃盒子，macOS 式指针距离放大。
 *
 * 默认收起，由右下角那颗 `IconApps` 按钮从下方滑出 / 收起；收进新窗口时自动展开一次。
 * 展开后右下角多一颗编辑按钮：编辑模式点图标不再打开，而是直接从程序坞移除。
 * 同一类窗口按种类分组摆在一起，组间画一道细线。打开 / 收起窗口的编排仍在 Provider 里。
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconApps,
  IconCheck,
  IconChevronDown,
  IconPencil,
  IconX,
} from '@tabler/icons-react';

import {
  DOCK_EDGE_GAP,
  DOCK_ITEM_SIZE,
  DOCK_MAGNIFICATION,
  DOCK_Z_INDEX,
} from '../constants';
import { useDock } from '../hooks/useDock';
import { groupDockEntries } from '../utils/dock-groups';

import { DOCK_KIND_ICON } from './constants';
import { resetMagnification } from './reset-magnification';

import styles from './index.scss';

/** 放大影响范围：以图标边长为基准，指针离得越远越接近原尺寸 */
const MAGNIFY_REACH_RATIO = 2.4;

const TOGGLE_ICON_SIZE = 18;
const EDIT_ICON_SIZE = 17;

const DockBar = () => {
  const {
    activeEntryId,
    entries,
    fullscreenCount,
    nativeFullscreen,
    receivingIds,
    remove,
    restore,
  } = useDock();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [editing, setEditing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef(false);
  /** 进全屏前的展开态：退出后要恢复，而不是把程序坞一直收着 */
  const openBeforeFullscreenRef = useRef(false);
  const empty = entries.length === 0;
  const showing = open && !empty;
  const editActive = editing && showing;
  /** 原生全屏时整条让开；CSS 全屏进入时由下方 effect 自动收起，之后被收进新窗口再弹出时减淡 */
  const hidden = nativeFullscreen;
  const dimmed = !hidden && fullscreenCount > 0 && showing;
  const controlsHidden = nativeFullscreen || fullscreenCount > 0;
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
      setEditing(false);
      setOpen(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [receivingIds.length]);

  /** 进入全屏先收掉程序坞与控件；退出时恢复进全屏前的展开态 */
  useEffect(() => {
    const inside = fullscreenCount > 0;

    if (inside && !fullscreenRef.current) {
      openBeforeFullscreenRef.current = open;
      setOpen(false);
      setEditing(false);
      resetMagnification(boxRef.current);
    } else if (!inside && fullscreenRef.current) {
      setOpen(openBeforeFullscreenRef.current);
    }

    fullscreenRef.current = inside;
  }, [fullscreenCount, open]);

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

    if (box === null || editActive) {
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

  const handleToggle = () => {
    const next = !open;

    setOpen(next);

    if (!next) {
      setEditing(false);
      resetMagnification(boxRef.current);
    }
  };

  const handleEditToggle = () => {
    const next = !editActive;

    setEditing(next);
    resetMagnification(boxRef.current);
  };

  const handleItemClick = (id: string) => {
    if (editActive) {
      if (entries.length <= 1) {
        setEditing(false);
      }

      remove(id);

      return;
    }

    restore(id);
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
        aria-hidden={showing && !hidden ? undefined : 'true'}
        aria-label="已收起的窗口"
        className={styles.dock}
        data-dock-dim={dimmed ? 'true' : undefined}
        data-dock-hidden={hidden ? 'true' : undefined}
        data-dock-open={showing ? 'true' : 'false'}
        data-editing={editActive ? 'true' : undefined}
        data-instant={instant ? 'true' : undefined}
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
                      aria-label={
                        editActive
                          ? `从程序坞移除「${entry.title}」`
                          : `${active ? '收起' : '打开'}「${entry.title}」`
                      }
                      aria-pressed={editActive ? undefined : active}
                      className={styles.dockItem}
                      data-active={active ? 'true' : undefined}
                      data-dock-item={entry.id}
                      data-editing={editActive ? 'true' : undefined}
                      data-kind={entry.kind}
                      data-receiving={receiving ? 'true' : undefined}
                      disabled={receiving}
                      onClick={() => handleItemClick(entry.id)}
                    >
                      <span className={styles.dockIcon}>
                        <Icon size={iconSize} stroke={1.55} />
                      </span>
                      {editActive ? (
                        <span aria-hidden="true" className={styles.dockRemove}>
                          <span className={styles.dockRemoveIcon}>
                            <IconX size={15} stroke={2} />
                          </span>
                        </span>
                      ) : null}
                      {active && !receiving && !editActive ? (
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

      <div
        className={styles.dockControls}
        data-controls-hidden={controlsHidden ? 'true' : undefined}
        data-dock-dim={dimmed ? 'true' : undefined}
        style={{ zIndex: DOCK_Z_INDEX }}
      >
        {showing ? (
          <Tooltip
            label={editActive ? '完成编辑' : '编辑程序坞'}
            position="left"
            transitionProps={{ duration: 80 }}
            withArrow
          >
            <UnstyledButton
              aria-label={editActive ? '完成编辑' : '编辑程序坞'}
              aria-pressed={editActive}
              className={styles.dockControl}
              data-active={editActive ? 'true' : undefined}
              onClick={handleEditToggle}
            >
              {editActive ? (
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
            aria-expanded={showing}
            aria-label={empty ? '程序坞为空' : toggleLabel}
            className={styles.dockControl}
            data-dock-toggle="true"
            disabled={empty}
            onClick={handleToggle}
          >
            <ToggleIcon size={TOGGLE_ICON_SIZE} stroke={1.8} />
            {!showing && !empty ? (
              <span aria-hidden="true" className={styles.dockToggleCount}>
                {entries.length}
              </span>
            ) : null}
          </UnstyledButton>
        </Tooltip>
      </div>
    </>
  );
};

export default DockBar;
