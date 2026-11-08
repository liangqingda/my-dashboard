/**
 * 全屏预览的状态：把整个框体铺满视口，只放大可读空间。
 *
 * 全屏时自己接管 Esc——这时按 Esc 是「退出全屏」而不是关闭弹窗；
 * 其它关闭路径（关闭按钮 / 遮罩 / 二次确认后关闭）走 `exit` 一并退出全屏，
 * 下次打开回到常规大小。
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * 管理弹窗的全屏开关与 Esc 语义。
 *
 * @returns `fullscreen` 当前是否全屏，`toggle` 切换，`exit` 无条件退出
 */
export const useModalFullscreen = (): {
  fullscreen: boolean;
  toggle: () => void;
  exit: () => void;
} => {
  const [fullscreen, setFullscreen] = useState(false);

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
  }, [fullscreen]);

  // 回调保持稳定：它们会进上层 useCallback 的依赖，每次新建会让关闭流程跟着重建
  const exit = useCallback(() => setFullscreen(false), []);
  const toggle = useCallback(() => setFullscreen((current) => !current), []);

  return { exit, fullscreen, toggle };
};
