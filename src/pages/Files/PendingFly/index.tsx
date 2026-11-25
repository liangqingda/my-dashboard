import { createElement, useEffect, useRef } from 'react';

import { entryIcon } from '../utils/entry-icon';

import type { PendingFlightLayerProps } from './types';

import styles from './index.scss';

const FLY_IN_MS = 420;
const FLY_OUT_MS = 360;

/** 系统开了「减少动态」就只留结果、不做位移 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 列表里的那一枚瓦片 / 表格行：移出时飞回它原位（路径带 `/`、空格，塞不进选择器，逐个比） */
const tileOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-entry-path]')) {
    if (node.dataset.entryPath === path) {
      return node;
    }
  }

  return null;
};

/** 待拖拽区里的那一格：移入时飞到它真正落脚的位置 */
const chipOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-pending-chip]')) {
    if (node.dataset.pendingChip === path) {
      return node;
    }
  }

  return null;
};

/**
 * 「条目在列表与待拖拽区之间挪动」的那一下动画。
 *
 * 不是飞到一个大概位置就淡掉，而是**飞到它真正落脚的那一格**：
 * - 移入：终点实测待拖拽区里那一格（已经渲染好，顺手先把它滚进视野），缩放也对到那一格的尺寸；
 * - 移出：终点实测列表里那张瓦片，飞回去落定。
 * 两端量不到（侧栏收起 / 瓦片不在屏幕上）就只做淡出淡入，不做越界位移。
 */
const PendingFlightLayer = ({ flight, onDone }: PendingFlightLayerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** 回调放 ref：effect 只跟「飞哪一条」走，别因为父级每次渲染的新函数重启动画 */
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const block = ref.current;

    if (block === null) {
      return undefined;
    }

    const { direction, entry, from } = flight;
    const finish = () => doneRef.current();

    if (prefersReducedMotion()) {
      finish();

      return undefined;
    }

    const to = direction === 'in' ? chipOf(entry.path) : tileOf(entry.path);

    if (to === null) {
      // 落点不存在（已经移出视野 / 侧栏收起）：原地淡掉，别乱飞
      const fade = block.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FLY_OUT_MS,
        easing: 'ease-out',
        fill: 'forwards',
      });

      fade.onfinish = finish;

      return () => fade.cancel();
    }

    to.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const box = to.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (from.left + from.width / 2);
    const dy = box.top + box.height / 2 - (from.top + from.height / 2);
    // 起飞块与落脚块的尺寸差压进缩放：落到那一格时正好同大，接得上后面已经渲染好的那一格
    const sx = Math.min(box.width / from.width, 1.4);
    const sy = Math.min(box.height / from.height, 1.4);
    const opacity = direction === 'in' ? 1 : 0.9;

    const move = block.animate(
      [
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        { opacity, transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      ],
      {
        duration: direction === 'in' ? FLY_IN_MS : FLY_OUT_MS,
        easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)',
        fill: 'forwards',
      },
    );

    move.onfinish = finish;

    return () => move.cancel();
  }, [flight]);

  return (
    <div
      aria-hidden="true"
      className={styles.fly}
      ref={ref}
      style={{
        height: flight.from.height,
        left: flight.from.left,
        top: flight.from.top,
        width: flight.from.width,
      }}
    >
      {createElement(entryIcon(flight.entry), { className: styles.icon, size: 40, stroke: 1.2 })}
    </div>
  );
};

export default PendingFlightLayer;
