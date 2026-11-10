/**
 * 悬停 / 聚焦意图：鼠标停住或键盘聚焦到目标元素上时为 true，移开或失焦立刻回 false。
 *
 * 用来把「只在被指到时才有意义」的重东西推迟到那一刻再创建：Tooltip 这类组件每次挂载
 * 都要建一套浮动定位实例，页面上几百个条目各自常驻一个，静止状态下的成本全白付；
 * 量宽这种强制布局读同理，几百条各量一次就是把一次布局拆成几百次重排。
 *
 * 返回的 handlers 要铺在**真正被指的那个元素**上。`onEnter` 在进入的同一事件里同步跑一次，
 * 供调用方现场量宽 / 取当前值，省掉「先进来、下一帧才拿到结果」的闪烁。
 */

import { useCallback, useState } from 'react';

/** 铺在被指元素上的四个事件处理器 */
type HoverIntentHandlers = {
  /** 鼠标移入：算「指到了」 */
  onMouseEnter: () => void;
  /** 鼠标移出：立刻取消 */
  onMouseLeave: () => void;
  /** 键盘聚焦：和悬停同等对待，键盘用户也拿得到提示 */
  onFocus: () => void;
  /** 失焦：立刻取消 */
  onBlur: () => void;
};

/**
 * 跟踪某个元素是否正被指着。
 *
 * @param onEnter 进入的那一刻同步执行（可用来现场量宽）；不需要就别传
 * @returns `[是否被指到, 事件处理器]`
 */
export const useHoverIntent = (onEnter?: () => void) => {
  const [active, setActive] = useState(false);

  const enter = useCallback(() => {
    onEnter?.();
    setActive(true);
  }, [onEnter]);

  const leave = useCallback(() => setActive(false), []);

  const handlers: HoverIntentHandlers = {
    onBlur: leave,
    onFocus: enter,
    onMouseEnter: enter,
    onMouseLeave: leave,
  };

  return [active, handlers] as const;
};
