import { useEffect, useRef } from 'react';

import { MOTION_EASING } from '@/utils/motion-easing';
import { prefersReducedMotion } from '@/utils/motion-geometry';

import { framesFor } from '../../utils/pending-frames';

import type { ReturnFlyProps } from './types';

import styles from './index.scss';

/**
 * 这一趟与「列表里那一项收进待拖拽区」用同一套帧与时长（见 `PendingFly`）：
 * 盖住原位 → 抬起 → 收到九成停一下 → 一路缩进落座那一格并淡出。
 * 缩进去的那一格是**它真正落座的位置**（手卡末尾那一行），不是手卡左上角。
 */
const FLY_MS = 560;

/**
 * 「把这次搬进文件夹的条目放回手卡」那一下：拿那格瓦片做整块拷贝，
 * 由大到小缩进手卡里它落座的那一格，落到时才收掉拷贝——看上去就是同一个东西被捡回去了。
 *
 * 飞行块起步时正好盖住原位，之后只缩不放，所以和列表 → 待拖拽区那一趟是同一个观感。
 */
const ReturnFly = ({ flight, onDone }: ReturnFlyProps) => {
  const ref = useRef<HTMLDivElement>(null);
  /** 回调放 ref：effect 只跟这一趟走，别因为父级每次渲染的新函数重启动画 */
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const block = ref.current;

    if (block === null) {
      return undefined;
    }

    const { from, node, to } = flight;
    const finish = () => doneRef.current();

    block.appendChild(node);

    if (prefersReducedMotion()) {
      finish();

      return undefined;
    }

    /** 收进那一格时缩到多小：按小的那一维等比缩，别把卡片压歪 */
    const endScale = Math.min(
      to.width / Math.max(from.width, 1),
      to.height / Math.max(from.height, 1),
      1,
    );
    /** 飞在半路时比落点略大一圈，看得出「正在缩进去」 */
    const midScale = Math.max(endScale * 1.6, 0.4);
    /** 落进那一格时再收一点、同时淡出，把位置交还真实的那一格 */
    const landScale = endScale * 0.85;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    const move = block.animate(
      framesFor({ direction: 'in', dx, dy, endScale, landScale, midScale }),
      {
        duration: FLY_MS,
        easing: MOTION_EASING.emphasized,
        fill: 'forwards',
      },
    );

    move.finished.then(finish, () => undefined);

    return () => move.cancel();
  }, [flight]);

  return (
    <div
      className={styles.block}
      ref={ref}
      style={{
        height: flight.from.height,
        left: flight.from.left,
        top: flight.from.top,
        width: flight.from.width,
      }}
    />
  );
};

export default ReturnFly;
