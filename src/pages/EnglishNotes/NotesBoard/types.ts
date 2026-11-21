/**
 * 看板分列组件的 props。
 */

import type { NoteColumn } from '../types';

/** 分列看板的入参 */
export type NotesBoardProps = {
  /** 各分类列（空列也在内，用来区分「整目录为空」与「这列为空」）；列数与标题来自记录仓库的分类清单 */
  columns: NoteColumn[];
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因；有错误时不出「还没有笔记」的空态 */
  error: string | null;
  /** 列表筛选是否生效：生效时空态说「没有符合条件的笔记」 */
  filtered?: boolean;
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => Promise<void>;
};
