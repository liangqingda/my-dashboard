/**
 * 切换计数浮标的入参。
 */

/** 媒体预览切换时左上角那一下计数（只报位置，不报标题） */
export type PreviewCounterProps = {
  /** 当前位置：从 1 开始 */
  index: number;
  /** 总数 */
  total: number;
  /**
   * 切换序号：每翻一篇由调用方加一。
   * 0 表示还没翻过（刚打开预览），此时不展示。
   */
  tick: number;
};
