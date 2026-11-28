/**
 * 遮罩点击的回焦保护：从外部应用切回浏览器后的第一下点击只用来拿焦点，不该直接关窗 / 收起。
 *
 * 时间窗只在这里定义，FreeModal 的遮罩点击判断统一走它；少一扇弹窗自己记一份时间戳。
 */

import { useEffect, useRef } from 'react';

/** 窗口拿回焦点后这段时间内的遮罩点击只当「回焦」，不关窗 */
const OVERLAY_FOCUS_GUARD_MS = 400;

/** 返回判断函数：最近刚回焦时返回 true，调用方据此忽略这一下遮罩点击 */
export const useOverlayFocusGuard = (): (() => boolean) => {
  const focusAtRef = useRef(0);

  useEffect(() => {
    const onFocus = () => {
      focusAtRef.current = performance.now();
    };

    window.addEventListener('focus', onFocus);

    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return () => performance.now() - focusAtRef.current < OVERLAY_FOCUS_GUARD_MS;
};
