/**
 * 翻篇快捷键：`]` / `】` 下一篇，`[` / `【` 上一篇，`←` / `→` 同样是前后翻。
 *
 * 只在预览态启用，且要放行两种情况：
 * - 带 ⌘ / Ctrl / Alt 的组合键（属于浏览器或系统）；
 * - 正在输入（筛选面板的输入框、可编辑区），那里字符属于输入本身。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

import type { NavigationShortcutParams } from '../types';

/**
 * 上一篇的按键。`【` 是中文输入法下同一个物理键打出来的全角方括号，
 * 用户多半在中文状态下顺手按，两种形态都要认。
 */
const PREVIOUS_KEYS = new Set(['[', '【']);

/** 下一篇的按键：`】` 理由同上 */
const NEXT_KEYS = new Set([']', '】']);

/** 监听 `[` / `]` 与方向键，在文档之间切换 */
export function useNavigationShortcuts({
  enabled,
  onPrevious,
  onNext,
}: NavigationShortcutParams): void {
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

      if (PREVIOUS_KEYS.has(event.key) || event.key === 'ArrowLeft') {
        if (onPrevious) {
          event.preventDefault();
          onPrevious();
        }

        return;
      }

      if (NEXT_KEYS.has(event.key) || event.key === 'ArrowRight') {
        if (onNext) {
          event.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onPrevious, onNext]);
}
