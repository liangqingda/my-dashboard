/**
 * 块级编辑器的 props。
 */

import type { MarkdownBlock } from '../types';

/** Markdown 块编辑器的入参 */
export type MarkdownBlockEditorProps = {
  /** 解析后的块列表 */
  blocks: MarkdownBlock[];
  /** 块列表变化时回调，交给调用方持有状态 */
  onChange: (blocks: MarkdownBlock[]) => void;
};
