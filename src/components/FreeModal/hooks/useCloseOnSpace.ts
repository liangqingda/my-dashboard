/**
 * 空格关弹窗：这扇窗的「退出」不止 Esc 一个键。
 *
 * 阅读类弹窗里空格最常见的手感是「往下翻」，但焦点往往还留在上一排在 header 上的图标按钮里，
 * 一按空格会被浏览器当成「点击当前焦点按钮」（表现为莫名翻到下一条 / 切了全屏），
 * 比什么都不发生更让人困惑。所以这里统一拦下来当「关窗」，并 `preventDefault` 掉按钮激活。
 *
 * 与 Esc 同一套放行口径：带 ⌘ / Ctrl / Alt 的组合键归浏览器；正在输入（输入框、可编辑区）时
 * 空格属于输入本身；按住不放的连发不算下一次。开不开由调用方的 `closeOnEscape` 决定
 * （编辑态、上层浮层开着时这两个键都不该关窗）。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

/** 空格关窗的入参 */
type CloseOnSpaceParams = {
  /** 是否生效：弹窗开着且允许关闭 */
  enabled: boolean;
  /** 关掉弹窗 */
  onClose: () => void;
};

/** 空格键按下时关弹窗，不触发焦点按钮，也不滚动正文 */
export const useCloseOnSpace = ({
  enabled,
  onClose,
}: CloseOnSpaceParams): void => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ') {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClose]);
};
