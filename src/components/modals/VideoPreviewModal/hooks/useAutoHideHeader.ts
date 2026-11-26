/**
 * header 的自动隐藏：鼠标一停就收起，一动就浮出。
 *
 * 预览弹窗打开时就该先看见画面，所以**初始是收起态**，第一次动鼠标才浮出——
 * 不再「进场先亮 1 秒」那样闪一下。禁用（设置面板 / 确认层开着）时恒为可见。
 * 监听挂在 window 上而不是 header 自身——header 收起后指针不可能再停在它上面，
 * 挂在它自己身上就再也唤不出来。每次活动都重置计时器，按住不放的移动不会被当成「静止」。
 *
 * `ignoreSelector` 圈出一块「不该唤出 header」的区域：指针在那一带上活动时既不亮 header、
 * 也不重置计时，让它按原来的节奏收起。视频预览里不传（弹窗里哪儿动鼠标都该浮出）。
 * `holdSelector` 圈出「指针停在上面就不收起」的区域（视频预览传 header 自身）：停在那一块里
 * 多久都保持可见，指针移到别处才开始计时收起。
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
 * @param enabled 是否启用自动隐藏（侧栏收起、且没有面板压在上面时传 true）
 * @param delay 静止多久收起（毫秒）
 * @param ignoreSelector 这个选择器命中的区域内活动不算「唤出 header」
 */
export const useAutoHideHeader = (
  enabled: boolean,
  delay = HEADER_HIDE_DELAY,
  ignoreSelector?: string,
  holdSelector?: string,
): boolean => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 以上一次「显示的」状态为起点：重新启用时先按收起态算，动鼠标才浮出
    let lastVisible = false;
    // 指针是否正停在「不收起」区域里；在里面时不排收起计时
    let holding = false;

    const clearTimer = () => {
      if (timer === undefined) {
        return;
      }

      clearTimeout(timer);
      timer = undefined;
    };

    const restartTimer = () => {
      clearTimer();
      timer = setTimeout(() => {
        lastVisible = false;
        setVisible(false);
      }, delay);
    };

    const show = () => {
      if (!lastVisible) {
        lastVisible = true;
        setVisible(true);
      }
    };

    /** 指针一有活动就亮出 header；不在「不收起」区域里才重新开始计时 */
    const reveal = () => {
      show();

      if (holding) {
        clearTimer();

        return;
      }

      restartTimer();
    };

    const handleActivity = (event: Event) => {
      if (isIgnored(event.target, ignoreSelector)) {
        // 从 header 移进被忽略区域（控制栏）：不再算「停在 header 上」，按常规节奏收起
        if (holding) {
          holding = false;
          restartTimer();
        }

        return;
      }

      holding =
        holdSelector !== undefined &&
        event.target instanceof Element &&
        event.target.closest(holdSelector) !== null;
      reveal();
    };

    /** 指针离开页面时（还停在 header 上就关掉窗口）：不再算「停在 header 上」，照常收起 */
    const handleLeaveWindow = () => {
      if (!holding) {
        return;
      }

      holding = false;
      restartTimer();
    };

    // 不再在启用时先亮一下：打开预览要先看到画面，第一次动鼠标才浮出 header
    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('wheel', handleActivity, { passive: true });
    document.addEventListener('pointerleave', handleLeaveWindow);

    return () => {
      clearTimer();

      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
      document.removeEventListener('pointerleave', handleLeaveWindow);
    };
  }, [delay, enabled, holdSelector, ignoreSelector]);

  /** 非全屏恒为可见：状态只在全屏里有意义，关闭全屏不必再走一遍 setState */
  return !enabled || visible;
};
