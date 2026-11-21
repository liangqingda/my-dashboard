/**
 * 语气 → 颜色类：常规走样式里的弱色，另外两档各自覆盖颜色。
 * 只有需要改色的语气才给类，`normal` 用 undefined 表示「不额外加类」。
 */

import type { HeaderIconActionTone } from './types';

import styles from './index.scss';

/** 各语气对应的颜色类 */
export const TONE_CLASS: Record<HeaderIconActionTone, string | undefined> = {
  normal: undefined,
  accent: styles.accent,
  danger: styles.danger,
};
