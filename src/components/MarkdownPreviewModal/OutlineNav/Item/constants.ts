/**
 * 标题层级 → 样式类：h1 更重，h3 / h4 逐级缩进并降低对比，h2 沿用基样式。
 */

import styles from './index.scss';

/** 层级 1–4 对应的字号 / 缩进；越界层级按基样式渲染 */
export const LEVEL_CLASS: Record<number, string | undefined> = {
  1: styles.level1,
  2: undefined,
  3: styles.level3,
  4: styles.level4,
};
