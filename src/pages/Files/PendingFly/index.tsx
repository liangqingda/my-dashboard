import { createElement, useEffect, useLayoutEffect, useRef } from 'react';

import { entryIcon } from '../utils/entry-icon';
import {
  cloneFlightBody,
  containingFolderOf,
  dressClone,
  pendingChipOf,
  pendingTileOf,
} from '../utils/pending-dom';
import { framesFor } from '../utils/pending-frames';

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

  /**
   * 起飞前量基准、摆外壳、起动画。
   *
   * 用 `useLayoutEffect` 而不是 `useEffect`：这一趟的起点要按**提交之后**的实测矩形算——
   * 全屏时待拖拽区一开（或一关），它会占走 / 让出内容区左侧一列，列表当场被挤动，
   * 点下去那一刻量的矩形已经过期；改在提交后量、并在绘制前摆好位置，才不会先闪一下旧位置。
   */
  useLayoutEffect(() => {
    const block = ref.current;

    if (block === null) {
      return undefined;
    }

    const { direction, entry, from } = flight;
    const finish = () => doneRef.current();

    // 连点同一条时上一趟可能还没跑完：先取消旧动画，新的一趟从头播，别叠成两份
    block.getAnimations().forEach((running) => running.cancel());

    // 复用同一个外壳时要复位：移出先图标，移入首帧就是真身（图标先藏着，别闪一下巨大图标）
    if (iconRef.current !== null) {
      iconRef.current.style.visibility = direction === 'in' ? 'hidden' : '';
    }

    if (prefersReducedMotion()) {
      finish();

      return undefined;
    }

    const tile = pendingTileOf(entry.path);
    const tileBox = tile?.getBoundingClientRect() ?? from;
    /**
     * 起飞基准：移入那一趟按瓦片**此刻**的矩形（见上一条：列表可能刚被挤动过），
     * 移出那一趟用待拖拽区那一格当时量的矩形（这一趟列表不动，量到的就是它）。
     */
    const origin = direction === 'in' ? tileBox : from;

    // 外壳的位置只在这里落定：渲染里只给尺寸，重渲染不会把它摆回旧位、动画也不会跳
    Object.assign(block.style, {
      height: `${tileBox.height}px`,
      left: `${origin.left + origin.width / 2 - tileBox.width / 2}px`,
      top: `${origin.top + origin.height / 2 - tileBox.height / 2}px`,
      width: `${tileBox.width}px`,
    });

    const chip = direction === 'in' ? pendingChipOf(entry.path) : null;
    /**
     * 落点：移出回列表里那张瓦片；它不在这一层（原先收在某个子文件夹里）时，
     * 飞向它所在的那个文件夹——不能因为找不到瓦片就什么都不飞。
     */
    const target =
      direction === 'in' ? chip : (tile ?? containingFolderOf(entry.path));

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

    const box = target.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (origin.left + origin.width / 2);
    const dy = box.top + box.height / 2 - (origin.top + origin.height / 2);
    /** 收进待拖拽区时缩到那一格的大小：按小的那一维等比缩，别把卡片压歪 */
    const endScale =
      direction === 'in'
        ? Math.min(box.width / tileBox.width, box.height / tileBox.height, 1)
        : 1;
    /** 飞在半路时的尺寸：比落点略大一圈，看得出「正在缩进去」 */
    const midScale = direction === 'in' ? Math.max(endScale * 1.6, 0.4) : 0.46;
    /** 落进那一格时再收一点、同时淡出，把位置交还真实的 chip */
    const landScale = endScale * 0.85;

    const clone =
      tile === null
        ? undefined
        : cloneFlightBody(tile, tileBox.width, tileBox.height, styles.rowBody);

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

      if (iconRef.current !== null) {
        iconRef.current.style.visibility = '';
      }
    };

    if (direction === 'in') {
      /*
       * 原件一直留在原位、不藏不换：飞行块本来就是它的整块拷贝，
       * 起步时正好盖住它，之后缩小着离开——原位那项从头到尾都看得见，不会闪。
       * 折返那一趟从半路接着走，手里是什么就接着用什么，不在起手时换班。
       */
      swap(true);
    }

    const morph = window.setTimeout(
      () => {
        if (direction === 'in') {
          swap(false);

          return;
        }

        // 没有真身可换（它原来收在子文件夹里，这一层量不到那张瓦片）：图标一路飞到文件夹
        if (clone !== undefined) {
          swap(true);
        }
      },
      FLY_MS * (direction === 'in' ? SHRINK_TO_ICON_AT : MORPH_AT),
    );

    /**
     * 没有真身的那一趟（飞去它所在的那个文件夹）：就一枚图标飞过去，
     * 到文件夹跟前放大一点并淡掉——别让它到点后凭空消失。
     */
    const frames =
      tile === null && direction === 'out'
        ? [
            { opacity: 1, transform: 'translate(0, 0) scale(1)' },
            { offset: 0.16, opacity: 1, transform: 'translate(0, -6px) scale(1)' },
            {
              offset: 0.72,
              opacity: 1,
              transform: `translate(${dx * 0.82}px, ${dy * 0.82}px) scale(1.15)`,
            },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(1.35)` },
          ]
        : framesFor({ direction, dx, dy, endScale, landScale, midScale });

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

  const tile = pendingTileOf(flight.entry.path);
  const size = tile?.getBoundingClientRect() ?? flight.from;
  /*
   * 图标按瓦片的六成画：换班那一刻飞行块已经缩到四成上下，
   * 图标约等于「刚才那张卡片的三分之二」，看上去是它收成了图标，不是突然变小。
   */
  const glyphSize = Math.round(Math.min(size.width, size.height) * 0.6);

  return (
    /*
     * 尺寸与位置由上面的 `useLayoutEffect` 按提交后的实测矩形落定，渲染里不再给：
     * 否则重渲染会把动画半路的外壳摆回旧位。
     */
    <div aria-hidden="true" className={styles.fly} ref={ref}>
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
