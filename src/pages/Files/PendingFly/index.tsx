import { createElement, useEffect, useRef, useState } from 'react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import { entryIcon } from '../utils/entry-icon';

import type { PendingFlightLayerProps } from './types';

import styles from './index.scss';

/** 一趟完整的「图标 → 小卡片 → 飞到位置 → 长到 90% → 停一下 → 落成 100%」用这么久 */
const FLY_MS = 560;

/** 换成卡片形态的时刻（占整趟的比例）：先给图标露个脸，再变成那一项的样子 */
const CARD_AT = 0.3;

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
 * 飞行块按**落点**的尺寸建（终点正好是那一格 / 那张瓦片），过程分四段：
 * 先用图标露个脸 → 变成「那一项小小的样子」（图标 + 名字的小卡片）飞过去 →
 * 到落点上方长到九成 → 停一下 → 再补到十成并往下沉几像素，落进位子。
 * 落点量不到（侧栏收起 / 瓦片不在屏幕上）就只做淡出，不乱飞。
 */
const PendingFlightLayer = ({ flight, onDone }: PendingFlightLayerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** 回调放 ref：effect 只跟「飞哪一条」走，别因为父级每次渲染的新函数重启动画 */
  const doneRef = useRef(onDone);
  /** 形态：先图标、后小卡片 */
  const [cardFace, setCardFace] = useState(false);

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
        duration: FLY_MS,
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

    /** 形态换代：图标换成「小的那一项」，此时飞行块还小，看不出拼接 */
    const morph = window.setTimeout(() => setCardFace(true), FLY_MS * CARD_AT);

    const move = block.animate(
      [
        { opacity: 1, transform: 'translate(0, 0) scale(0.3)' },
        { opacity: 1, offset: 0.16, transform: 'translate(0, -6px) scale(0.3)' },
        {
          opacity: 1,
          offset: 0.62,
          transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(0.42)`,
        },
        {
          opacity: 1,
          offset: 0.84,
          transform: `translate(${dx}px, ${dy}px) scale(0.9)`,
        },
        {
          opacity: 1,
          offset: 0.93,
          transform: `translate(${dx}px, ${dy}px) scale(0.9)`,
        },
        { opacity: 1, transform: `translate(${dx}px, ${dy + 4}px) scale(1)` },
      ],
      {
        duration: FLY_MS,
        easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)',
        fill: 'forwards',
      },
    );

    move.onfinish = finish;

    return () => {
      window.clearTimeout(morph);
      move.cancel();
    };
  }, [flight]);

  const box = flight.direction === 'in' ? chipOf(flight.entry.path) : tileOf(flight.entry.path);
  const size = box?.getBoundingClientRect() ?? flight.from;

  return (
    <div
      aria-hidden="true"
      className={styles.fly}
      ref={ref}
      style={{
        height: size.height,
        left: flight.from.left + flight.from.width / 2 - size.width / 2,
        top: flight.from.top + flight.from.height / 2 - size.height / 2,
        width: size.width,
      }}
    >
      {cardFace ? (
        <div className={styles.card}>
          {createElement(entryIcon(flight.entry), {
            'aria-hidden': true,
            className: styles.cardIcon,
            size: 20,
            stroke: 1.2,
          })}
          <FreeTruncatedText
            className={styles.cardName}
            disabled
            ellipsis="end"
            text={flight.entry.name}
          />
        </div>
      ) : (
        createElement(entryIcon(flight.entry), {
          'aria-hidden': true,
          className: styles.icon,
          size: 32,
          stroke: 1.2,
        })
      )}
    </div>
  );
};

export default PendingFlightLayer;
