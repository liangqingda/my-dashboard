/**
 * 标题层级 → 样式类：h1 最重，往下逐级降字号 / 降对比。
 * 缩进不在这里——层级由 List 的每层引导线表示，h2 不再沿用基样式是为了单独给字重。
 */

import styles from './index.scss';

/** 层级 1–4 对应的字号 / 字重 / 颜色；越界层级按基样式渲染 */
export const LEVEL_CLASS: Record<number, string | undefined> = {
  1: styles.level1,
  2: styles.level2,
  3: styles.level3,
  4: styles.level4,
};
