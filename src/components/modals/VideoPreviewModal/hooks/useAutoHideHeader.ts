/**
 * 全屏时 header 的自动隐藏：鼠标一停就收起，一动就浮出。
 *
 * 只在全屏里生效；非全屏时恒为可见。监听挂在 window 上而不是 header 自身——
 * header 收起后指针不可能再停在它上面，挂在它自己身上就再也唤不出来。
 * 每次活动都重置计时器，按住不放的移动不会被当成「静止」。
 */

import { useEffect, useState } from 'react';

import { HEADER_HIDE_DELAY } from '../constants';

/**
 * 返回 header 当前是否应该显示。
 *
 * @param enabled 是否启用自动隐藏（全屏时传 true）
 * @param delay 静止多久收起（毫秒）
 */
export const useAutoHideHeader = (
  enabled: boolean,
  delay = HEADER_HIDE_DELAY,
): boolean => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 以上一次「显示的」状态为起点：上次全屏结束时可能停在隐藏态，这里必须重新亮出 header
    let lastVisible = false;

    const hide = () => {
      lastVisible = false;
      setVisible(false);
    };

    const show = () => {
      if (!lastVisible) {
        lastVisible = true;
        setVisible(true);
      }

      if (timer !== undefined) {
        clearTimeout(timer);
      }

      timer = setTimeout(hide, delay);
    };

    // 刚进入全屏（或鼠标在别处）也先亮一会儿，再由计时器收起
    show();

    window.addEventListener('pointermove', show);
    window.addEventListener('pointerdown', show);
    window.addEventListener('wheel', show, { passive: true });

    return () => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      window.removeEventListener('wheel', show);
    };
  }, [delay, enabled]);

  /** 非全屏恒为可见：状态只在全屏里有意义，关闭全屏不必再走一遍 setState */
  return !enabled || visible;
};
