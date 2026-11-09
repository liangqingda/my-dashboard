/**
 * 看板分列组件的 props。
 */

import type { NoteColumn } from '../types';

/** 分列看板的入参 */
export type NotesBoardProps = {
  /** 五列（空列也在内，用来区分「整目录为空」与「这列为空」） */
  columns: NoteColumn[];
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因；有错误时不出「还没有笔记」的空态 */
  error: string | null;
  /** 打开某一篇笔记的预览 */
  onOpen: (name: string) => Promise<void>;
};
