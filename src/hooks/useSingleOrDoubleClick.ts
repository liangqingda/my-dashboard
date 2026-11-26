/**
 * 单击 / 双击的区分：单击等一个双击窗口再执行，第二下到来就把这次单击作废。
 *
 * 媒体预览里「单击一个动作、双击另一个动作」是一对固定需求——图片预览单点切 header 显隐、
 * 双击切整屏；视频预览单点切播放 / 暂停、双击切整屏。双击时那两下 click 必然先到，
 * 不能让它们顺带把单击动作也执行一遍（视频里就是「双击时播放 / 暂停闪一下」），
 * 所以单击必须让位一个窗口给第二下。
 *
 * 代价是单击动作晚 `DOUBLE_CLICK_WINDOW` 生效：只给单击开槽的场景（播放器没传双击动作时）
 * 不要用它，直接同步执行。
 *
 * 回调放进 `ref`：计时器要到窗口结束才触发，期间可能已经重新渲染、换了 props，
 * 定时器里要执行的是最新那次渲染给出的动作，不是排计时那一刻的闭包。
 */

import { useEffect, useRef } from 'react';

/**
 * 双击窗口（毫秒）：取系统双击间隔的常见上限——太短会把慢一点的连点当成两次单击，
 * 双击就变成「先执行一次单击动作，再切全屏」。
 */
export const DOUBLE_CLICK_WINDOW = 300;

/** 单击 / 双击的动作：都铺在同一个元素上 */
export type UseSingleOrDoubleClickResult = {
  /** 单击：排到双击窗口结束才执行；窗口内又点了一下就作废 */
  onClick: () => void;
  /** 双击：作废待办的那次单击，当场执行双击动作 */
  onDoubleClick: () => void;
  /** 撤掉还没执行的那次单击（关窗、上层拦截时用） */
  cancel: () => void;
};

/**
 * @param onSingle 单击动作（延后一个双击窗口执行）
 * @param onDouble 双击动作（作废那一对里的单击后立刻执行）
 */
export const useSingleOrDoubleClick = (
  onSingle: () => void,
  onDouble: () => void,
): UseSingleOrDoubleClickResult => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 最新一次渲染给出的两个动作 */
  const handlersRef = useRef({ onDouble, onSingle });

  useEffect(() => {
    handlersRef.current = { onDouble, onSingle };
  });

  /** 停掉待办的那次单击 */
  const cancel = () => {
    if (timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /** 卸载时清掉计时器：不能对着已经消失的画面改状态 */
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
    cancel,
    onClick: () => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        handlersRef.current.onSingle();
      }, DOUBLE_CLICK_WINDOW);
    },
    onDoubleClick: () => {
      cancel();
      handlersRef.current.onDouble();
    },
  };
};
