/**
 * 全屏预览的状态：把整个框体铺满视口，只放大可读空间。
 *
 * 全屏是「怎么看」的偏好，不是某一篇的属性，所以记在 localStorage 里：
 * 换篇、关掉重开、刷新页面后都还是上次的样子；Esc（或再点一次按钮）只切回常规大小。
 */

import { useCallback, useEffect } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import { FLAG_CODEC } from '@/utils/local-storage';

import { FULLSCREEN_STORAGE_KEY } from '../constants';

/**
 * 管理弹窗的全屏开关与 Esc 语义。
 *
 * @returns `fullscreen` 当前是否全屏，`toggle` 切换
 */
export const useModalFullscreen = (): {
  fullscreen: boolean;
  toggle: () => void;
} => {
  const [fullscreen, setFullscreen] = useStoredState(
    FULLSCREEN_STORAGE_KEY,
    FLAG_CODEC,
  );

  // 全屏时自己接管 Esc：这时按 Esc 是「退出全屏」，不会顺带把弹窗也关掉
  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }

    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    };

    window.addEventListener('keydown', exitOnEscape);

    return () => window.removeEventListener('keydown', exitOnEscape);
  }, [fullscreen, setFullscreen]);

  const toggle = useCallback(
    () => setFullscreen(!fullscreen),
    [fullscreen, setFullscreen],
  );

  return { fullscreen, toggle };
};
