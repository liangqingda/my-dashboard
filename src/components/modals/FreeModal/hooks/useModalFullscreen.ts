/**
 * 弹窗全屏的状态：把整个框体铺满视口，只放大可读空间。
 *
 * 全屏是「怎么看」的偏好，不是某一条内容的属性，所以记在 localStorage 里：
 * 换篇、关掉重开、刷新页面后都还是上次的样子；再点一次按钮切回常规大小。
 *
 * Esc 不归这里管：Esc 永远是「关掉弹窗」，全屏跟着一起关——同一个键在两种模式下意思不同，
 * 用户只会记住那一次「按了没关掉」。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import { FLAG_CODEC } from '@/utils/local-storage';

/**
 * 管理弹窗的全屏开关。
 *
 * @param storageKey 记住全屏偏好的 localStorage 键（每个业务弹窗一把，互不影响）
 * @returns `fullscreen` 当前是否全屏，`toggle` 切换
 */
export const useModalFullscreen = (
  storageKey: string,
): {
  fullscreen: boolean;
  toggle: () => void;
} => {
  const [fullscreen, setFullscreen] = useStoredState(storageKey, FLAG_CODEC);

  const toggle = useCallback(
    () => setFullscreen(!fullscreen),
    [fullscreen, setFullscreen],
  );

  return { fullscreen, toggle };
};
