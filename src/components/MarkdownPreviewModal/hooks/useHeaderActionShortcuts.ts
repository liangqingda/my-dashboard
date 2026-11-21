/**
 * header 操作快捷键：`a` 开合字号面板、`s` 开合筛选面板、`c` 复制相对路径、
 * `r` 刷新正文、`f` 切换全屏。
 *
 * 与翻篇 / 删除快捷键同一套放行口径：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统；
 * 正在输入（筛选面板输入框、可编辑区）时字符属于输入本身，不抢。大小写都认
 * （`S` / `s` 等价，大小写锁定不影响）。各动作没有能力（回调为空）时按键不动作。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

import type { HeaderActionShortcutParams } from '../types';

/** 开合字号面板 */
const FONT_KEY = 'a';
/** 开合筛选面板 */
const FILTER_KEY = 's';
/** 复制相对路径 */
const COPY_KEY = 'c';
/** 刷新正文 */
const REFRESH_KEY = 'r';
/** 切换全屏 */
const FULLSCREEN_KEY = 'f';

/** 监听 header 操作键，分别触发对应动作 */
export function useHeaderActionShortcuts({
  enabled,
  onCopy,
  onRefresh,
  onToggleFilter,
  onToggleFont,
  onToggleFullscreen,
}: HeaderActionShortcutParams): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case FONT_KEY:
          if (onToggleFont) {
            event.preventDefault();
            onToggleFont();
          }

          break;
        case FILTER_KEY:
          if (onToggleFilter) {
            event.preventDefault();
            onToggleFilter();
          }

          break;
        case COPY_KEY:
          if (onCopy) {
            event.preventDefault();
            onCopy();
          }

          break;
        case REFRESH_KEY:
          if (onRefresh) {
            event.preventDefault();
            onRefresh();
          }

          break;
        case FULLSCREEN_KEY:
          if (onToggleFullscreen) {
            event.preventDefault();
            onToggleFullscreen();
          }

          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onCopy, onRefresh, onToggleFilter, onToggleFont, onToggleFullscreen]);
}
