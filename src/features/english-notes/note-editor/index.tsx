import { useState } from 'react';

import type { MarkdownEditorProps } from '@/components/MarkdownPreviewModal';

import BlockEditor from '../block-editor';
import {
  parseMarkdownBlocks,
  serializeMarkdownBlocks,
  type MarkdownBlock,
} from '../markdown-blocks';

import styles from './index.scss';

/**
 * 学习笔记专用编辑器：进编辑时把正文切成块，表格走受控网格，其余块编辑源码片段。
 *
 * 这是「定制编辑」的参考实现——公共组件只提供插槽，笔记长什么样、怎么改回文本，
 * 都由这一类文档自己说了算。换成按块重拼，只会在保存时重排一次格式。
 */
const NoteEditor = ({ markdown, onChange }: MarkdownEditorProps) => {
  const [blocks, setBlocks] = useState<MarkdownBlock[]>(() =>
    parseMarkdownBlocks(markdown),
  );

  /** 块列表变化：自己留一份，同时把拼好的 Markdown 交给弹窗当草稿 */
  const handleChange = (next: MarkdownBlock[]) => {
    setBlocks(next);
    onChange(serializeMarkdownBlocks(next));
  };

  return (
    <div className={styles.editor}>
      <BlockEditor blocks={blocks} onChange={handleChange} />
    </div>
  );
};

export default NoteEditor;
