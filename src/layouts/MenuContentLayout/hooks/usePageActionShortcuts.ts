/**
 * 页面级操作快捷键：`r` 刷新当前页面、`f` 切换全屏；页面可选再挂 `s` 开合筛选面板、
 * `c` 开合收藏面板、`⌘↑` 回到上一级目录，以及 `Esc` 收掉页面自己的临时状态（不传就不接管）。
 *
 * 放行口径与弹窗快捷键一致：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统（`⌘↑` 是唯一例外，
 * 由页面显式给了上级目录回调才接管）；正在输入（输入框、文本域、可编辑区）时字符属于
 * 输入本身，不抢。事件落点不在本页容器内（预览弹窗这类浮层接管了焦点）时也放行，避免
 * 弹窗打开时按键同时触发页面与弹窗两套操作；落点是 `body` / `<html>` 表示没聚焦任何控件，
 * 按页面内按键处理。大小写都认（`R` / `r` 等价，大小写锁定不影响）。
 */

import { useEffect, type RefObject } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

/** 刷新当前页面 */
const REFRESH_KEY = 'r';
/** 切换全屏 */
const FULLSCREEN_KEY = 'f';
/** 开合筛选面板 */
const FILTER_KEY = 's';
/** 开合收藏面板 */
const FAVORITES_KEY = 'c';

/** 页面级操作快捷键的入参 */
type PageActionShortcutParams = {
  /** 页面容器：事件落点不在容器内（浮层接管焦点）时放行 */
  containerRef: RefObject<HTMLElement | null>;
  /** 刷新当前页面 */
  onRefresh: () => void;
  /** 切换全屏 */
  onToggleFullscreen: () => void;
  /** 回到上一级目录；不传则 `⌘↑` 不动作 */
  onNavigateParent?: () => void;
  /** 开合筛选面板；不传则 `S` 不动作 */
  onToggleFilter?: () => void;
  /** 开合收藏面板；不传则 `C` 不动作 */
  onToggleFavorites?: () => void;
  /**
   * `Esc` 收掉页面自己的临时状态（文件页用来退出批量拖拽状态并清空待拖拽区）。
   * 不传就不接管；弹窗开着时事件落在弹窗内，按容器判定直接放行，仍由弹窗自己处理。
   */
  onEscape?: () => void;
};

/** 监听页面操作键，分别触发刷新、全屏与页面可选的面板 / 目录动作 */
export function usePageActionShortcuts({
  containerRef,
  onEscape,
  onNavigateParent,
  onRefresh,
  onToggleFilter,
  onToggleFavorites,
  onToggleFullscreen,
}: PageActionShortcutParams): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

      if (event.metaKey || event.ctrlKey || event.altKey) {
        // `⌘↑` 回上级目录是组合键里唯一留给页面动作的；其余组合键归浏览器 / 系统
        if (
          event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          event.key === 'ArrowUp' &&
          onNavigateParent
        ) {
          event.preventDefault();
          onNavigateParent();
        }

        return;
      }

      if (event.key === 'Escape') {
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }

        return;
      }

      /** 有回调才抢键并拦默认行为；没回调的档位不吞字符 */
      const run = (handler?: () => void) => {
        if (handler) {
          event.preventDefault();
          handler();
        }
      };

      switch (event.key.toLowerCase()) {
        case REFRESH_KEY:
          run(onRefresh);
          break;
        case FULLSCREEN_KEY:
          run(onToggleFullscreen);
          break;
        case FILTER_KEY:
          run(onToggleFilter);
          break;
        case FAVORITES_KEY:
          run(onToggleFavorites);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    containerRef,
    onEscape,
    onNavigateParent,
    onRefresh,
    onToggleFilter,
    onToggleFavorites,
    onToggleFullscreen,
  ]);
}
