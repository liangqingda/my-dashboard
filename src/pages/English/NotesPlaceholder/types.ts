/**
 * 列表占位（加载 / 空态）的 props。
 */

/** 列表占位的入参 */
export type NotesPlaceholderProps = {
  /** 本列笔记数：0 且整盘有笔记时说明只是这一列为空；整表平铺不分列时不用传 */
  columnTotal?: number;
  /** 读取失败的原因；有错误时不出「还没有笔记」的空态 */
  error: string | null;
  /** 是否正在读取 */
  loading: boolean;
  /** 可见的笔记总数，0 才说明整目录为空 */
  total: number;
};
