/**
 * 控制栏显隐：与外壳的浮层 header 同一套节奏——打开即收起态，指针一动就浮出，
 * 静止 `delay` 收起；指针停在控制栏上时不收起（正要点按钮它却淡下去）。
 *
 * 播放状态不参与：暂停 / 播完也照常自动收起，让出画面——视频预览的 header 就是这个口径，
 * 两层 chrome 跟着同一片指针活动一起浮出、一起收掉（见 `FreeModal` 的 `headerOverlay`）。
 *
 * 唯一按住不收起的是「上层业务弹层开着」（`suspended`）：设置 / 选集面板是从控制栏长出来的
 * portal 浮层，指针移进去就离开了播放器，不能让它开着、按钮却先淡下去。
 *
 * 「指针是否停在控制栏上」放 ref：收起计时器的回调读不到渲染期的 state。
 * 计时器只在这里管，播放器不再自己 `setTimeout`，别处也不要再挂一份同样的计时。
 */

import { useEffect, useRef, useState } from 'react';

/** 控制栏显隐的动作与当前可见状态 */
export type UseControlsVisibilityResult = {
  /** 控制栏当前是否可见 */
  visible: boolean;
  /** 指针在播放器里动了一下：亮出来并重新计时 */
  reveal: () => void;
  /** 指针离开播放器：照常收起 */
  leavePlayer: () => void;
  /** 指针进入控制栏：始终显示，不计时 */
  enterControls: () => void;
  /** 指针离开控制栏 */
  leaveControls: () => void;
};

/** 入参：收起时长 + 是否被上层弹层压住 */
export type UseControlsVisibilityOptions = {
  /**
   * 上层业务弹层（设置 / 选集这类，从控制栏长出来的）开着：控制栏恒为可见、不排收起——
   * 面板是 portal，指针移进去就离开了播放器，不按住的话面板还开着、它的按钮先淡下去了。
   */
  suspended?: boolean;
  /**
   * 另一层 chrome（预览弹窗的浮层 header）的选择器：指针落到它上面时，控制栏**立即**收起。
   * header 与 footer 是同一片画面上下的两层 chrome，指针去了 header 就说明这一眼不是在操作播放，
   * 控制栏不该还挂在画面底部（反向关系由 `headerOverlay.ignoreSelector` 保证：去控制栏时 header 也当场收起）。
   */
  hideOnSelector?: string;
};

export const useControlsVisibility = (
  delay: number,
  { hideOnSelector, suspended = false }: UseControlsVisibilityOptions = {},
): UseControlsVisibilityResult => {
  /** 打开即收起态：先看画面，指针一动才浮出（与浮层 header 一致） */
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  /** 排一次收起：指针停着不在控制栏上、也没有弹层压着才真的收 */
  const scheduleHide = () => {
    clearTimer();

    if (suspended || hoveringRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(false);
    }, delay);
  };

  /**
   * 被弹层压住期间常驻：清掉挂着的收起计时。
   * 可见性由返回值的 `suspended` 直接兜住，不在 effect 里 `setState`（那会引发级联渲染，
   * 而弹层都是从控制栏点开的，进入压住态时本来就是可见的）。
   */
  useEffect(() => {
    if (!suspended || timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, [suspended]);

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

  /**
   * 指针落到另一层 chrome（浮层 header）上：当场收起，不排计时——
   * 两边各自管自己的显隐，指针只在其中一层时另一层不该还亮着。
   * 监听挂在 window 上：header 在播放器容器外，播放器自己收不到那一段指针。
   */
  useEffect(() => {
    if (hideOnSelector === undefined) {
      return undefined;
    }

    const handleMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;

      if (target === null || target.closest(hideOnSelector) === null) {
        return;
      }

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      hoveringRef.current = false;
      setVisible(false);
    };

    window.addEventListener('pointermove', handleMove);

    return () => window.removeEventListener('pointermove', handleMove);
  }, [hideOnSelector]);

  return {
    enterControls: () => {
      hoveringRef.current = true;
      clearTimer();
      setVisible(true);
    },
    leaveControls: () => {
      hoveringRef.current = false;
      scheduleHide();
    },
    leavePlayer: () => scheduleHide(),
    reveal: () => {
      setVisible(true);
      scheduleHide();
    },
    /** 弹层压着时恒为可见，不看 state（压住期间不会有收起计时跑起来） */
    visible: suspended || visible,
  };
};
