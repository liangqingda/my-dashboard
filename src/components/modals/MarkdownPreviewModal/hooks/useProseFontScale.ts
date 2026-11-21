/**
 * 正文的字号微调：在「常规 / 全屏各自的默认字号」之上再叠一段用户偏移。
 *
 * 这一段只属于「怎么看」，不属于某一篇，所以记在 localStorage 里：换篇、关掉重开、
 * 刷新页面后都保持上次的样子。全屏那 2px 由 CSS 的 `--prose-grow` 负责，这里只管
 * 用户自己点出来的那几档（`--prose-extra`），退出全屏不会把用户调过的结果冲掉。
 */

import { useCallback } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import type { StoredCodec } from '@/utils/local-storage';

import {
  PROSE_FONT_MAX,
  PROSE_FONT_MIN,
  PROSE_FONT_STEP,
  PROSE_FONT_STORAGE_KEY,
} from '../constants';

/**
 * 把偏移夹进上下限并对齐步长：手工改坏存储（999、小数）时也不会渲染出一个离谱字号。
 *
 * @param value 待修正的偏移（px）
 * @returns 落在 `[PROSE_FONT_MIN, PROSE_FONT_MAX]` 且为步长整数倍的偏移
 */
const clampOffset = (value: number): number =>
  Math.min(
    PROSE_FONT_MAX,
    Math.max(
      PROSE_FONT_MIN,
      Math.round(value / PROSE_FONT_STEP) * PROSE_FONT_STEP,
    ),
  );

/** 存一段像素偏移：没写过、不是数字时回到 0（即各模式的默认字号） */
const PROSE_FONT_CODEC: StoredCodec<number> = {
  decode: (raw) => {
    const parsed = Number.parseInt(raw ?? '', 10);

    return Number.isNaN(parsed) ? 0 : clampOffset(parsed);
  },
  encode: (value) => String(clampOffset(value)),
};

/** 正文字号的当前偏移与一组操作：整包递给字号按钮，不必在弹窗里再拆一遍 */
export type ProseFontScale = {
  /** 当前偏移（px）；0 表示各模式的默认字号 */
  offset: number;
  /** 还能不能再加 / 减一档 */
  canIncrease: boolean;
  canDecrease: boolean;
  /** 加 / 减一档 */
  increase: () => void;
  decrease: () => void;
  /** 回到默认字号 */
  reset: () => void;
};

/**
 * 管理正文的字号偏移与加减操作。
 *
 * @returns 当前偏移与加减 / 复位动作（`ProseFontScale`）
 */
export const useProseFontScale = (): ProseFontScale => {
  const [offset, setOffset] = useStoredState(
    PROSE_FONT_STORAGE_KEY,
    PROSE_FONT_CODEC,
  );

  const increase = useCallback(
    () => setOffset(clampOffset(offset + PROSE_FONT_STEP)),
    [offset, setOffset],
  );

  const decrease = useCallback(
    () => setOffset(clampOffset(offset - PROSE_FONT_STEP)),
    [offset, setOffset],
  );

  const reset = useCallback(() => setOffset(0), [setOffset]);

  return {
    canDecrease: offset > PROSE_FONT_MIN,
    canIncrease: offset < PROSE_FONT_MAX,
    decrease,
    increase,
    offset,
    reset,
  };
};
