/**
 * header 操作快捷键：`a` 开合字号面板、`s` 开合筛选面板、`r` 刷新正文。
 *
 * 翻篇（`[` `]` / ← →）、`f` 全屏、`c` 复制与 `Delete` / `Backspace` 删除都属弹窗外壳的通用键位，
 * 统一在 `FreeModal/hooks/useModalShortcuts` 里处理，业务侧不重复监听 ——
 * 复制与删除在两扇阅读弹窗（md 预览、记录详情）都要用，留在这里就会出现「一边能用、另一边不能」。
 *
 * 与外壳那套同一放行口径：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统；
 * 正在输入（筛选面板输入框、可编辑区）时字符属于输入本身，不抢。大小写都认
 * （`S` / `s` 等价，大小写锁定不影响）。各动作没有能力（回调为空）时按键不动作——
 * hook 按能力可选挂接：第二处弹窗用到哪个按钮就传哪个回调，不要求整组都挂
 * （如子区块预览只传 `onToggleFont`，只挂字号 `A`）。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

import type { HeaderActionShortcutParams } from '../types';

/** 开合字号面板 */
const FONT_KEY = 'a';
/** 开合筛选面板 */
const FILTER_KEY = 's';
/** 刷新正文 */
const REFRESH_KEY = 'r';

/** 监听 header 操作键，分别触发对应动作 */
export function useHeaderActionShortcuts({
  enabled,
  onRefresh,
  onToggleFilter,
  onToggleFont,
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
        case REFRESH_KEY:
          if (onRefresh) {
            event.preventDefault();
            onRefresh();
          }

          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onRefresh, onToggleFilter, onToggleFont]);
}
