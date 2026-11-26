/**
 * header 的自动隐藏：鼠标一停就收起，一动就浮出。
 *
 * 媒体预览（图片 / 视频）打开时就该先看见画面，所以**启用时先是收起态**，第一次动鼠标才浮出；
 * 上层浮层开着时由 `FreeModal` 传 `enabled: false` 进来，恒为可见。
 * 监听挂在 window 上而不是 header 自身——header 收起后指针不可能再停在它上面，
 * 挂在它自己身上就再也唤不出来。每次活动都重置计时器，按住不放的移动不会被当成「静止」。
 *
 * 两个选择器圈出两种「不算普通指针活动」的区域：
 * - `holdSelector`：指针停在上面就不收起（传 header 自身），停在那一块里多久都保持可见，
 *   指针移到别处才开始计时收起；
 * - `ignoreSelector`：指针在里面活动**不算唤出**（如播放器控制栏）。控制栏有自己的显隐节奏，
 *   在上面挪指针不该把 header 顶出来：一进去就当场收起，也不再排收起计时。
 *
 * 只认指针移动 / 滚轮：点击本身不算活动——点画面是切播放 / 收弹层，
 * 不该在按下那一刻顺手把 header 顶出来。
 */

import { useEffect, useState } from 'react';

import { HEADER_HIDE_DELAY } from '../constants';

type UseAutoHideHeaderOptions = {
  /** 是否启用自动隐藏（没有面板压在上面时传 `true`；点开点关的弹窗整组不启用） */
  enabled: boolean;
  /** 静止多久收起（毫秒） */
  delay?: number;
  /** 指针停在命中的区域里就不收起（预览弹窗传 header 自身） */
  holdSelector?: string;
  /** 指针在命中的区域里活动不算唤出（如播放器控制栏） */
  ignoreSelector?: string;
};

/**
 * 返回 header 当前是否应该显示：未启用时恒为可见；启用时按指针活动收放。
 */
export const useAutoHideHeader = ({
  delay = HEADER_HIDE_DELAY,
  enabled,
  holdSelector,
  ignoreSelector,
}: UseAutoHideHeaderOptions): boolean => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 指针是否正停在「不收起」区域里；在里面时不排收起计时
    let holding = false;

    const clearTimer = () => {
      if (timer === undefined) {
        return;
      }

      clearTimeout(timer);
      timer = undefined;
    };

    const hide = () => setVisible(false);

    const restartTimer = () => {
      clearTimer();
      timer = setTimeout(hide, delay);
    };

    /** 命中的事件目标是否落在某个选择器圈出的区域里 */
    const hits = (target: Element | null, selector?: string) =>
      selector !== undefined && target !== null && target.closest(selector) !== null;

    /** 指针移动 / 滚轮：亮出 header，并按这次活动重新计时收起 */
    const handleActivity = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;

      // 控制栏这类自己管显隐的 chrome：header 当场收起，也不重新计时
      if (hits(target, ignoreSelector)) {
        holding = false;
        clearTimer();
        hide();

        return;
      }

      holding = hits(target, holdSelector);

      setVisible(true);

      if (holding) {
        clearTimer();

        return;
      }

      restartTimer();
    };

    /** 指针离开页面时（还停在 header 上就关掉窗口）：不再算「停在 header 上」，照常收起 */
    const handleLeaveWindow = () => {
      if (!holding) {
        return;
      }

      holding = false;
      restartTimer();
    };

    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('wheel', handleActivity, { passive: true });
    document.addEventListener('pointerleave', handleLeaveWindow);

    return () => {
      clearTimer();

      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('wheel', handleActivity);
      document.removeEventListener('pointerleave', handleLeaveWindow);
    };
  }, [delay, enabled, holdSelector, ignoreSelector]);

  /** 非启用态恒为可见：暂停时不必再走一遍自动隐藏 */
  return !enabled || visible;
};
