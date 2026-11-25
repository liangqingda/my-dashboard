import { createElement, useEffect, useRef } from 'react';

import { entryIcon } from '../utils/entry-icon';

import type { PendingFlightLayerProps } from './types';

import styles from './index.scss';

/** 一趟完整的「图标 → 那一项的样子 → 飞到位置 → 长到 90% → 停一下 → 落成 100%」用这么久 */
const FLY_MS = 560;

/** 换成真身（列表里那一项的原样拷贝）的时刻（占整趟的比例）：先给图标露个脸 */
const MORPH_AT = 0.3;

/** 收进待拖拽区时，缩到多小才把真身换回图标（占整趟的比例）：与回来那趟的 0.3 对称 */
const SHRINK_TO_ICON_AT = 0.62;

/** 系统开了「减少动态」就只留结果、不做位移 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 列表里的那一枚瓦片 / 表格行：路径带 `/`、空格，塞不进选择器，逐个比 */
const tileOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-entry-path]')) {
    if (node.dataset.entryPath === path) {
      return node;
    }
  }

  return null;
};

/** 待拖拽区里的那一格：移入时的落点 */
const chipOf = (path: string): HTMLElement | null => {
  for (const node of document.querySelectorAll<HTMLElement>('[data-pending-chip]')) {
    if (node.dataset.pendingChip === path) {
      return node;
    }
  }

  return null;
};

/**
 * 让拷贝保持「列表里那一项的原样」，只改会影响它自己跑起来的部分：
 * 去掉 `id`（重复 id 会让样式 / 查询串味），不响应指针，也不要再被当成点选目标。
 */
const dressClone = (clone: HTMLElement, width: number, height: number) => {
  clone.removeAttribute('id');
  clone.removeAttribute('tabindex');
  // 飞行块本身也会被 `[data-entry-path]` 扫到：拷贝不能冒充「列表里的那一项」
  clone.removeAttribute('data-entry-path');

  for (const node of clone.querySelectorAll('[id]')) {
    node.removeAttribute('id');
  }

  Object.assign(clone.style, {
    position: 'absolute',
    inset: '0',
    width: `${width}px`,
    height: `${height}px`,
    margin: '0',
    pointerEvents: 'none',
  });
};

/**
 * 「条目在列表与待拖拽区之间挪动」的那一下动画。
 *
 * 空中飞的那一块不是另画的卡片，而是**列表里那一项的原样深拷贝**（视频帧、文件名、边距、悬停按钮
 * 全都在），所以回落那一刻看上去就是「同一个东西缩小又长大」，只是尺寸在变：
 *
 * 1. 起点是一枚按类型取的小图标（认得出是什么类型）；
 * 2. 到三成时换成真身，此时还很小——「整个项目小小的样子」；
 * 3. 飞向落点，到落点上方长到九成、停一下；
 * 4. 再补到十成并往下沉几像素，落进位子。
 *
 * 落点量不到（瓦片不在采光内 / 侧栏收起）就只把图标淡掉，不乱飞。
 */
const PendingFlightLayer = ({ flight, onDone }: PendingFlightLayerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** 图标那一层：换真身时直接隐藏，不再走一次重渲染 */
  const iconRef = useRef<HTMLSpanElement>(null);
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

    // 复用同一个外壳时要复位：移出先图标，移入首帧就是真身（图标先藏着，别闪一下巨大图标）
    if (iconRef.current !== null) {
      iconRef.current.style.visibility = direction === 'in' ? 'hidden' : '';
    }

    if (prefersReducedMotion()) {
      finish();

      return undefined;
    }

    const tile = tileOf(entry.path);
    const chip = direction === 'in' ? chipOf(entry.path) : null;
    /** 落点：移出回列表里那张瓦片，移入去待拖拽区那一格 */
    const target = direction === 'in' ? chip : tile;

    if (target === null) {
      const fade = block.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FLY_MS,
        easing: 'ease-out',
        fill: 'forwards',
      });

      fade.onfinish = finish;

      return () => fade.cancel();
    }

    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const tileBox = tile?.getBoundingClientRect() ?? from;
    const box = target.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (from.left + from.width / 2);
    const dy = box.top + box.height / 2 - (from.top + from.height / 2);
    /** 收进待拖拽区时缩到那一格的大小：按小的那一维等比缩，别把卡片压歪 */
    const endScale =
      direction === 'in'
        ? Math.min(box.width / tileBox.width, box.height / tileBox.height, 1)
        : 1;
    /** 飞在半路时的尺寸：比落点略大一圈，看得出「正在缩进去」 */
    const midScale = direction === 'in' ? Math.max(endScale * 1.6, 0.4) : 0.46;
    /** 落进那一格时再收一点、同时淡出，把位置交还真实的 chip */
    const landScale = endScale * 0.85;

    const clone = tile?.cloneNode(true) as HTMLElement | undefined;

    if (clone !== undefined) {
      dressClone(clone, tileBox.width, tileBox.height);
    }

    /**
     * 真身与图标什么时候换班：
     * - 移回列表：先图标，到三成时换真身（此时还小，看不出拼接）；
     * - 收进待拖拽区：反过来——刚离开时就是**整块的自己**（盖在原位上），
     *   一路缩到很小时把真身换回图标，再落进那一格。
     */
    const swap = (toClone: boolean) => {
      if (toClone) {
        if (iconRef.current !== null) {
          iconRef.current.style.visibility = 'hidden';
        }

        if (clone !== undefined) {
          block.appendChild(clone);
        }

        return;
      }

      clone?.remove();

      if (iconRef.current !== null) {
        iconRef.current.style.visibility = '';
      }
    };

    if (direction === 'in') {
      /*
       * 原件一直留在原位、不藏不换：飞行块本来就是它的整块拷贝，
       * 起步时正好盖住它，之后缩小着离开——原位那项从头到尾都看得见，不会闪。
       */
      swap(true);
    }

    const morph = window.setTimeout(
      () => swap(direction !== 'in'),
      FLY_MS * (direction === 'in' ? SHRINK_TO_ICON_AT : MORPH_AT),
    );

    const frames =
      direction === 'in'
        ? [
            { opacity: 1, transform: 'translate(0, 0) scale(1)' },
            { opacity: 1, offset: 0.08, transform: 'translate(0, -6px) scale(1)' },
            { opacity: 1, offset: 0.2, transform: 'translate(0, -8px) scale(0.9)' },
            { opacity: 1, offset: 0.32, transform: 'translate(0, -8px) scale(0.9)' },
            {
              opacity: 1,
              offset: 0.62,
              transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(${midScale})`,
            },
            { opacity: 1, offset: 0.84, transform: `translate(${dx}px, ${dy}px) scale(${endScale})` },
            { opacity: 1, offset: 0.92, transform: `translate(${dx}px, ${dy}px) scale(${endScale})` },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${landScale})` },
          ]
        : [
            { opacity: 1, transform: 'translate(0, 0) scale(0.3)' },
            { opacity: 1, offset: 0.16, transform: 'translate(0, -6px) scale(0.3)' },
            {
              opacity: 1,
              offset: 0.62,
              transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(${midScale})`,
            },
            { opacity: 1, offset: 0.84, transform: `translate(${dx}px, ${dy}px) scale(0.9)` },
            { opacity: 1, offset: 0.93, transform: `translate(${dx}px, ${dy}px) scale(0.9)` },
            { opacity: 1, transform: `translate(${dx}px, ${dy + 3}px) scale(1)` },
          ];

    const move = block.animate(frames, {
      duration: FLY_MS,
      easing: 'cubic-bezier(0.32, 0.72, 0.24, 1)',
      fill: 'forwards',
    });

    move.onfinish = finish;

    return () => {
      window.clearTimeout(morph);
      move.cancel();
    };
  }, [flight]);

  const tile = tileOf(flight.entry.path);
  const size = tile?.getBoundingClientRect() ?? flight.from;
  /*
   * 图标按瓦片的六成画：换班那一刻飞行块已经缩到四成上下，
   * 图标约等于「刚才那张卡片的三分之二」，看上去是它收成了图标，不是突然变小。
   */
  const glyphSize = Math.round(Math.min(size.width, size.height) * 0.6);

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
      <span
        className={styles.icon}
        ref={iconRef}
        style={{ visibility: flight.direction === 'in' ? 'hidden' : undefined }}
      >
        {createElement(entryIcon(flight.entry), {
          'aria-hidden': true,
          className: styles.iconGlyph,
          size: glyphSize,
          stroke: 1.2,
        })}
      </span>
    </div>
  );
};

export default PendingFlightLayer;
