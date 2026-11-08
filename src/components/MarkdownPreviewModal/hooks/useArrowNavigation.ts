/**
 * `←` / `→` 快捷键翻篇：只在预览态、且没有任何相邻文档时关掉。
 */

import { useEffect } from 'react';

import type { ArrowNavigationParams } from '../types';

/** 监听方向键，在文档之间切换 */
export function useArrowNavigation({
  enabled,
  onPrevious,
  onNext,
}: ArrowNavigationParams): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'ArrowLeft' && onPrevious) {
        event.preventDefault();
        onPrevious();

        return;
      }

      if (event.key === 'ArrowRight' && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onPrevious, onNext]);
}
