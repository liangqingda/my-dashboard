/**
 * 阅读类弹窗的整套键盘口径，只在这里定义一次：业务弹窗不各自补快捷键。
 *
 * - `Esc`：关窗（由 Mantine `Modal` 的 `closeOnEscape` 负责，不在这里）；
 * - **空格**：关窗，并 `preventDefault` 掉浏览器「空格 = 点击当前焦点按钮」的默认行为
 *   —— 焦点常留在 header 图标上，不拦的话按空格会莫名翻到下一条 / 切了全屏；
 * - **`[` / `【`、`←` 上一篇；`]` / `】`、`→` 下一篇**（有 `nav` 且没被禁用时）；
 * - **`F` 全屏开关**（有全屏按钮时）。
 *
 * 放行口径统一：带 ⌘ / Ctrl / Alt 的组合键归浏览器或系统；正在输入（输入框、可编辑区）
 * 时字符属于输入本身；按住不放的连发不算下一次。`disabled` 是业务侧的整组开关
 * （加载中、上层浮层开着），空格关窗另由 `closeOnSpace` 单独把关。
 */

import { useEffect } from 'react';

import { isTypingTarget } from '@/utils/typing-target';

import type { FreeModalNav } from '../types';

/** 上一篇的按键：中文输入法下同一个物理键打出全角方括号，两种形态都认 */
const PREVIOUS_KEYS = new Set(['[', '【']);

/** 下一篇的按键：理由同上 */
const NEXT_KEYS = new Set([']', '】']);

/** 整套快捷键的入参 */
type ModalShortcutsParams = {
  /** 弹窗开着才吃键 */
  enabled: boolean;
  /** 整组收掉（加载中、上层浮层开着时由调用方传 true） */
  disabled: boolean;
  /** 空格是否关窗（默认跟随 Esc 的开关） */
  closeOnSpace: boolean;
  /** 关窗 */
  onClose: () => void;
  /** 翻页配置；不传表示这扇窗没有翻页 */
  nav?: FreeModalNav;
  /** 切换全屏；不传表示没有全屏按钮 */
  onToggleFullscreen?: () => void;
};

/** 监听空格、翻页键与全屏键 */
export const useModalShortcuts = ({
  closeOnSpace,
  disabled,
  enabled,
  nav,
  onClose,
  onToggleFullscreen,
}: ModalShortcutsParams): void => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === ' ') {
        if (closeOnSpace) {
          event.preventDefault();
          onClose();
        }

        return;
      }

      if (disabled) {
        return;
      }

      if (event.key.toLowerCase() === 'f' && onToggleFullscreen) {
        event.preventDefault();
        onToggleFullscreen();

        return;
      }

      if (nav === undefined || nav.disabled === true) {
        return;
      }

      if (PREVIOUS_KEYS.has(event.key) || event.key === 'ArrowLeft') {
        if (nav.onPrevious) {
          event.preventDefault();
          nav.onPrevious();
        }

        return;
      }

      if (NEXT_KEYS.has(event.key) || event.key === 'ArrowRight') {
        if (nav.onNext) {
          event.preventDefault();
          nav.onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOnSpace, disabled, enabled, nav, onClose, onToggleFullscreen]);
};
