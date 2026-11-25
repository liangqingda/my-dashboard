/**
 * 控制栏显隐：暂停 / 播完常驻，播放中指针静止一会儿收起（`delay`），
 * 指针停在控制栏上时始终显示；指针一动就立刻浮出并重新计时。
 *
 * 「是否在播」与「指针是否停在控制栏上」放 ref：收起计时器的回调读不到渲染期的 state。
 * 计时器只在这里管，播放器不再自己 `setTimeout`，也别处不要再挂一份同样的计时。
 */

import { useEffect, useRef, useState } from 'react';

/** 控制栏显隐的动作与当前可见状态 */
export type UseControlsVisibilityResult = {
  /** 控制栏当前是否可见 */
  visible: boolean;
  /** 指针在播放器里动了一下：亮出来并重新计时 */
  reveal: () => void;
  /** 暂停 / 播完：常驻，不再计时收起 */
  hold: () => void;
  /** 开播：先留着，指针一停再收 */
  resume: () => void;
  /** 指针离开播放器 */
  leavePlayer: () => void;
  /** 指针进入控制栏：始终显示，不计时 */
  enterControls: () => void;
  /** 指针离开控制栏 */
  leaveControls: () => void;
};

export const useControlsVisibility = (
  delay: number,
): UseControlsVisibilityResult => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 是否正在播放的即时副本 */
  const playingRef = useRef(false);
  /** 指针是否停在控制栏上的即时副本 */
  const hoveringRef = useRef(false);

  /** 停掉待发的收起计时 */
  const clearTimer = () => {
    if (timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /** 排一次收起：在播、且指针不在控制栏上才真的收 */
  const scheduleHide = () => {
    clearTimer();

    if (!playingRef.current || hoveringRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(false);
    }, delay);
  };

  /** 卸载时清掉挂着的计时器 */
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return {
    enterControls: () => {
      hoveringRef.current = true;
      clearTimer();
      setVisible(true);
    },
    hold: () => {
      playingRef.current = false;
      clearTimer();
      setVisible(true);
    },
    leaveControls: () => {
      hoveringRef.current = false;
      scheduleHide();
    },
    leavePlayer: () => scheduleHide(),
    resume: () => {
      playingRef.current = true;
      scheduleHide();
    },
    reveal: () => {
      setVisible(true);
      scheduleHide();
    },
    visible,
  };
};
