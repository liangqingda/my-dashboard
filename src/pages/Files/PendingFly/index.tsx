import { createElement, useEffect, useRef } from 'react';

import { entryIcon } from '../utils/entry-icon';

import type { PendingFlyLayerProps } from './types';

import styles from './index.scss';

/** 落点：待拖拽区面板往里一点的位置，从面板左上角算 */
const DROP_INSET = 26;
const FLY_MS = 420;

/** 系统开了「减少动态」就只留结果、不做位移 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 「条目挪进待拖拽区」的那一下动画：点选（⌘ / Shift + 点击）把一个瓦片收进待拖拽区时，
 * 从瓦片原位飞一块小图标过去，落到侧栏面板上，让人看清「它被挪到哪儿了」。
 *
 * 用 Web Animations API 做一次 translate + 缩小 + 淡出，起点是点选那一刻的瓦片矩形
 * （由 `useDragPending` 带过来），终点实测待拖拽区面板（`[data-pending-drop]`）。
 * 播完由页面 `clearFly` 收掉这一层；DOM 上没有起终点（比如侧栏收起）就直接跳过。
 */
const PendingFlyLayer = ({ fly, onDone }: PendingFlyLayerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** 回调放 ref：effect 只跟「飞哪一条」走，别因为父级每次渲染的新函数重启动画 */
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const chip = ref.current;
    const target = document.querySelector('[data-pending-drop]');

    if (chip === null || !(target instanceof HTMLElement) || prefersReducedMotion()) {
      doneRef.current();

      return undefined;
    }

    const { from } = fly;
    const to = target.getBoundingClientRect();
    const dx = to.left + DROP_INSET - (from.left + from.width / 2);
    const dy = to.top + DROP_INSET - (from.top + from.height / 2);

    const animation = chip.animate(
      [
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        { opacity: 0.9, transform: `translate(${dx}px, ${dy}px) scale(0.36)` },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)', fill: 'forwards' },
    );

    animation.onfinish = () => doneRef.current();

    return () => animation.cancel();
  }, [fly]);

  return (
    <div
      aria-hidden="true"
      className={styles.fly}
      ref={ref}
      style={{
        height: fly.from.height,
        left: fly.from.left,
        top: fly.from.top,
        width: fly.from.width,
      }}
    >
      {createElement(entryIcon(fly.entry), { className: styles.icon, size: 40, stroke: 1.2 })}
    </div>
  );
};

export default PendingFlyLayer;
