/**
 * header 的自动隐藏：鼠标一停就收起，一动就浮出。
 *
 * 媒体预览（图片 / 视频）打开时就该先看见画面，所以**启用时先是收起态**，第一次动鼠标才浮出；
 * 暂停（设置面板 / 列表弹层 / 确认层开着）或点击固定时由 `FreeModal` 传 `false` 进来，恒为可见。
 * 监听挂在 window 上而不是 header 自身——header 收起后指针不可能再停在它上面，
 * 挂在它自己身上就再也唤不出来。每次活动都重置计时器，按住不放的移动不会被当成「静止」。
 *
 * `holdSelector` 圈出「指针停在上面就不收起」的区域（传 header 自身）：停在那一块里
 * 多久都保持可见，指针移到别处才开始计时收起。
 *
 * 状态带「轮次」（`resetToken`）：与当前轮次对不上就当作没亮过。需要「当场收起」而不只是暂停时
 * （如图片预览解除固定），调用方把轮次加一，已亮着的那一轮随之作废——不必在 effect 里改状态。
 */

import { useEffect, useState } from 'react';

import { HEADER_HIDE_DELAY } from '../constants';

/** 亮过的那一轮：`token` 与当前轮次对不上就当作没亮 */
type RevealState = {
  token: number;
  visible: boolean;
};

/**
 * 返回 header 当前是否应该显示。
 *
 * @param enabled 是否启用自动隐藏（没有面板压在上面、也没有被点击固定时传 true）
 * @param delay 静止多久收起（毫秒）
 * @param holdSelector 指针停在命中的区域里就不收起（预览弹窗传 header 自身）
 * @param resetToken 当前轮次：加一即「换一轮」，已亮着的 header 当场按收起态算
 */
export const useAutoHideHeader = (
  enabled: boolean,
  delay = HEADER_HIDE_DELAY,
  holdSelector?: string,
  resetToken = 0,
): boolean => {
  const [reveal, setReveal] = useState<RevealState>({
    token: 0,
    visible: false,
  });

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

    /** 收起：同一轮里已经收起就不必再动状态（每次指针移动都会走到这里） */
    const hide = () => {
      setReveal((prev) =>
        prev.token === resetToken && !prev.visible
          ? prev
          : { token: resetToken, visible: false },
      );
    };

    const restartTimer = () => {
      clearTimer();
      timer = setTimeout(hide, delay);
    };

    /** 指针移动 / 滚轮：亮出 header，并按这次活动重新计时收起 */
    const handleActivity = (event: Event) => {
      holding =
        holdSelector !== undefined &&
        event.target instanceof Element &&
        event.target.closest(holdSelector) !== null;

      setReveal((prev) =>
        prev.token === resetToken && prev.visible
          ? prev
          : { token: resetToken, visible: true },
      );

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

    /*
     * 只认指针移动 / 滚轮：点击（pointerdown）不唤出——静止时点画面切固定态，不该顺手把 header 顶出来。
     */
    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('wheel', handleActivity, { passive: true });
    document.addEventListener('pointerleave', handleLeaveWindow);

    return () => {
      clearTimer();

      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('wheel', handleActivity);
      document.removeEventListener('pointerleave', handleLeaveWindow);
    };
  }, [delay, enabled, holdSelector, resetToken]);

  /** 非启用态恒为可见：暂停 / 固定时不必再走一遍自动隐藏 */
  return !enabled || (reveal.token === resetToken && reveal.visible);
};
