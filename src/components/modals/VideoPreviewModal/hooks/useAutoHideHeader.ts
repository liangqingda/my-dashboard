/**
 * 全屏时 header 的自动隐藏：鼠标一停就收起，一动就浮出。
 *
 * 只在全屏里生效；非全屏时恒为可见。监听挂在 window 上而不是 header 自身——
 * header 收起后指针不可能再停在它上面，挂在它自己身上就再也唤不出来。
 * 每次活动都重置计时器，按住不放的移动不会被当成「静止」。
 *
 * `ignoreSelector` 圈出一块「不该唤出 header」的区域（播放器控制栏）：
 * 指针在那一带上活动时既不亮 header、也不重置计时，让它按原来的节奏收起。
 */

import { useEffect, useState } from 'react';

import { HEADER_HIDE_DELAY } from '../constants';

/** 事件目标是否落在被忽略的区域里（事件目标可能不是元素，如 window / document） */
const isIgnored = (
  target: EventTarget | null,
  ignoreSelector: string | undefined,
): boolean =>
  ignoreSelector !== undefined &&
  target instanceof Element &&
  target.closest(ignoreSelector) !== null;

/**
 * 返回 header 当前是否应该显示。
 *
 * @param enabled 是否启用自动隐藏（全屏时传 true）
 * @param delay 静止多久收起（毫秒）
 * @param ignoreSelector 这个选择器命中的区域内活动不算「唤出 header」
 */
export const useAutoHideHeader = (
  enabled: boolean,
  delay = HEADER_HIDE_DELAY,
  ignoreSelector?: string,
): boolean => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 以上一次「显示的」状态为起点：上次全屏结束时可能停在隐藏态，这里必须重新亮出 header
    let lastVisible = false;

    const restartTimer = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        lastVisible = false;
        setVisible(false);
      }, delay);
    };

    /** 指针一有活动就亮出 header，并重新开始计时 */
    const reveal = () => {
      if (!lastVisible) {
        lastVisible = true;
        setVisible(true);
      }

      restartTimer();
    };

    const handleActivity = (event: Event) => {
      if (isIgnored(event.target, ignoreSelector)) {
        return;
      }

      reveal();
    };

    // 刚进入全屏（或鼠标在别处）也先亮一会儿，再由计时器收起
    reveal();

    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('wheel', handleActivity, { passive: true });

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, [delay, enabled, ignoreSelector]);

  /** 非全屏恒为可见：状态只在全屏里有意义，关闭全屏不必再走一遍 setState */
  return !enabled || visible;
};
