/**
 * 文件夹落点的两级计时：停在某一格满 `SPRING_HOVER_MS` 播弹起，再等 `SPRING_ENTER_MS` 真进去。
 *
 * 计时器句柄、当前目标、弹起目标、卸载清理都收在这一份里——
 * 会话状态机只管「谁被拖着、当前在哪一层」，不再自己拎一串 `setTimeout`。
 */

import { useEffect, useRef, useState } from 'react';

import { SPRING_ENTER_MS, SPRING_HOVER_MS } from './constants';
import { clearTimer } from './utils';

/** 入参：命中满一秒后要去的动作（`goTo` 那一层） */
export type HoverTargetsArgs = {
  /** 真正换层：弹起动画播完才调 */
  goTo: (path: string) => void;
};

export const useHoverTargets = ({ goTo }: HoverTargetsArgs) => {
  /** 指针正停在哪个文件夹上（决定倒计时条与高亮） */
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  /** 正在播弹起动画的文件夹路径 */
  const [springPath, setSpringPath] = useState<string | null>(null);
  /** 当前目标与两级计时句柄：事件回调里读的是「此刻」，不能靠渲染闭包 */
  const hoverRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);

  /** 归零：两级计时、目标、弹起动画一起清（松手 / 换层 / 关窗都走它） */
  const resetHover = () => {
    clearTimer(hoverTimerRef.current, () => {
      hoverTimerRef.current = null;
    });
    clearTimer(enterTimerRef.current, () => {
      enterTimerRef.current = null;
    });
    hoverRef.current = null;
    setHoverPath(null);
    setSpringPath(null);
  };

  /** 指针停到某一格：同一个目标不重启计时，换目标才从零数一秒 */
  const hoverFolder = (path: string) => {
    if (hoverRef.current === path) {
      return;
    }

    resetHover();
    hoverRef.current = path;
    setHoverPath(path);

    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      setSpringPath(path);
      enterTimerRef.current = window.setTimeout(() => {
        enterTimerRef.current = null;
        goTo(path);
      }, SPRING_ENTER_MS);
    }, SPRING_HOVER_MS);
  };

  /** 指针离开某一格：只清它自己的计时，别误清刚停上去的新目标 */
  const leaveFolder = (path: string) => {
    if (hoverRef.current !== path) {
      return;
    }

    resetHover();
  };

  // 卸载时兜一次：挂着计时被拆掉，回调还会去碰已经没了的组件
  useEffect(
    () => () => {
      clearTimer(hoverTimerRef.current, () => {
        hoverTimerRef.current = null;
      });
      clearTimer(enterTimerRef.current, () => {
        enterTimerRef.current = null;
      });
    },
    [],
  );

  return { hoverFolder, hoverPath, leaveFolder, resetHover, springPath };
};
