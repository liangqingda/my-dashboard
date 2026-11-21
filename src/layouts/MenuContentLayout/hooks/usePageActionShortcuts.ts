/**
 * 页面级操作快捷键：`r` 刷新当前页面、`f` 切换全屏。
 *
 * 放行口径与弹窗快捷键一致：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统；正在输入
 * （输入框、文本域、可编辑区）时字符属于输入本身，不抢。事件落点不在本页容器内
 * （预览弹窗这类浮层接管了焦点）时也放行，避免弹窗打开时按键同时触发页面与弹窗
 * 两套操作；落点是 `body` / `<html>` 表示没聚焦任何控件，按页面内按键处理。
 * 大小写都认（`R` / `r` 等价，大小写锁定不影响）。
 */

import { useEffect, type RefObject } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

/** 刷新当前页面 */
const REFRESH_KEY = 'r';
/** 切换全屏 */
const FULLSCREEN_KEY = 'f';

/** 页面级操作快捷键的入参 */
type PageActionShortcutParams = {
  /** 页面容器：事件落点不在容器内（浮层接管焦点）时放行 */
  containerRef: RefObject<HTMLElement | null>;
  /** 刷新当前页面 */
  onRefresh: () => void;
  /** 切换全屏 */
  onToggleFullscreen: () => void;
};

/** 监听页面操作键，分别触发刷新与全屏切换 */
export function usePageActionShortcuts({
  containerRef,
  onRefresh,
  onToggleFullscreen,
}: PageActionShortcutParams): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const container = containerRef.current;
      const { target } = event;
      /** 没聚焦任何控件时落点是 body / html：这属于页面内按键，不算浮层接管 */
      const isRootTarget =
        target === document.body || target === document.documentElement;

      if (
        container &&
        target instanceof HTMLElement &&
        !isRootTarget &&
        !container.contains(target)
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case REFRESH_KEY:
          event.preventDefault();
          onRefresh();
          break;
        case FULLSCREEN_KEY:
          event.preventDefault();
          onToggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, onRefresh, onToggleFullscreen]);
}
