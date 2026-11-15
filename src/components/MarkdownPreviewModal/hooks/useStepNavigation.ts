/**
 * 翻篇导航：方括号 / 方向键快捷键 + 翻篇按钮的焦点指示，一起管。
 *
 * 焦点为什么要跟着方向走：弹窗打开时 Mantine 的焦点陷阱会把焦点放在弹窗里第一个可聚焦元素——
 * 也就是「上一篇」按钮，之后按任意键都会让那圈 `:focus-visible` 焦点环显形，看起来像
 * 「往右翻却亮着左边」。所以按 `]` / `→` 时先把焦点挪到「下一篇」，按 `[` / `←` 挪到「上一篇」，
 * 焦点环落在哪一侧就表示这次往哪边翻。鼠标点按钮本来就会自然聚焦，不走这一层。
 */

import { useRef } from 'react';

import type { StepNavigationParams, StepNavigationState } from '../types';

import { useNavigationShortcuts } from './useNavigationShortcuts';

/** 交出两个按钮的 ref（标题栏挂载用），并替调用方挂好带焦点指示的翻篇快捷键 */
export function useStepNavigation({
  enabled,
  onPrevious,
  onNext,
}: StepNavigationParams): StepNavigationState {
  const previousButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  useNavigationShortcuts({
    enabled,
    onNext: onNext
      ? () => {
          nextButtonRef.current?.focus();
          onNext();
        }
      : onNext,
    onPrevious: onPrevious
      ? () => {
          previousButtonRef.current?.focus();
          onPrevious();
        }
      : onPrevious,
  });

  return { previousButtonRef, nextButtonRef };
}
