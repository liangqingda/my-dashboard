import { useEffect, useRef } from 'react';

import type { ReturnFlyProps } from './types';

import styles from './index.scss';

/** 这一趟飞多久：比进列表那趟短一点，回手卡是很轻的一下 */
const FLY_MS = 420;

/** 系统开了「减少动态」就只留结果、不做位移 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 「把这次搬进文件夹的条目放回手卡」那一下：拿被拿走的那格瓦片做整块拷贝，
 * 从它原来的位置缩着飞进手卡，落到时才收掉拷贝——看上去就是同一个东西被捡回去了。
 *
 * 飞的是**瓦片本人的深拷贝**，所以视频帧、文件名、体积、样式全都对得上，
 * 不是另画一块小卡片。
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

    const scale = Math.min(1, to.width / Math.max(from.width, 1));
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    const move = block.animate(
      [
        { opacity: 1, transform: 'translate(0, 0) scale(1)' },
        {
          offset: 0.55,
          opacity: 0.95,
          transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(${Math.max(scale * 1.4, 0.3)})`,
        },
        {
          opacity: 0.7,
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' },
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
