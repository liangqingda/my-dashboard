/**
 * 删除快捷键：预览态按删除键，打开删除这篇文档的二次确认层。
 *
 * 两个键都认：`Delete` 是键盘右侧的 Forward Delete；
 * macOS 键盘上印着「delete」的那一颗发出来的是 `Backspace`——用户按的就是自己键盘上的删除键，
 * 只认一个会让另一半人觉得「快捷键没反应」。
 *
 * 按键只打开确认层、不直接删：真正的删除仍要再点一次红色按钮，
 * 一次误按不该把文档连同它牵连的学习记录一起删掉。
 * 放行的情况与翻篇快捷键同一套：带 ⌘ / Ctrl / Alt 的组合键、正在输入时字符属于输入本身。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

import type { RemoveShortcutParams } from '../types';

/** 删除键的两种形态：Forward Delete 与 macOS 键盘上的 delete（Backspace） */
const REMOVE_KEYS = new Set(['Delete', 'Backspace']);

/** 监听删除键，在预览态打开二次确认层 */
export function useRemoveShortcut({
  enabled,
  onRequest,
}: RemoveShortcutParams): void {
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

      if (!REMOVE_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      onRequest();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onRequest]);
}
