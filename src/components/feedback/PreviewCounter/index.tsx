/**
 * 媒体预览的切换计数浮标：翻到下一张 / 下一条时，左上角浮出「3 / 12」，1 秒后自己收掉。
 *
 * 为什么单独成件：图片与视频两扇预览都要这一下反馈，收起口径（位置、字号、停留时长、
 * 显隐动画）必须一模一样，各写一份迟早漂移；它与标题栏无关——header 与侧栏默认藏着，
 * 用户只想知道「现在第几个」，不需要整条 header 跟着冒出来。
 *
 * 常挂不卸：显隐靠可见态上的过渡，卸掉就只剩「啪」地出现，没有消失的动画；
 * `pointer-events: none`，它不会挡住底下的画面与点击。
 */

import { useEffect, useState } from 'react';
import { Badge } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { PreviewCounterProps } from './types';

import styles from './index.scss';

/** 浮标停留多久后收起（毫秒）：够看清一个数字，又不至于挡着画面 */
const SHOW_MS = 1000;

const PreviewCounter = ({ index, tick, total }: PreviewCounterProps) => {
  /** 已经到点收起的那个切换序号：显隐由它和 tick 一比，不用在 effect 里同步改可见态 */
  const [expiredTick, setExpiredTick] = useState(0);

  useEffect(() => {
    // 0 是「刚打开、还没翻过」：不展示，也就不排收起计时
    if (tick === 0) {
      return undefined;
    }

    const timer = setTimeout(() => setExpiredTick(tick), SHOW_MS);

    return () => clearTimeout(timer);
  }, [tick]);

  const visible = tick !== 0 && tick !== expiredTick;

  return (
    <Badge
      aria-live="polite"
      className={cx(styles.counter, visible && styles.visible)}
      color="gray"
      size="lg"
      variant="light"
    >
      {index} / {total}
    </Badge>
  );
};

export default PreviewCounter;
