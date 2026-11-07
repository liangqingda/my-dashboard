import { useEffect, useRef, useState } from 'react';

import type { MarkdownEditorProps } from '@/components/MarkdownPreviewModal';

import BlockEditor from '../block-editor';
import {
  parseMarkdownBlocks,
  serializeMarkdownBlocks,
  type MarkdownBlock,
} from '../markdown-blocks';

import styles from './index.scss';

/** 撤销栈保留的步数 */
const UNDO_DEPTH = 50;

/** 判断事件目标是不是正在输入的控件（那里交给浏览器自己的撤销） */
const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

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
  /** 原文件用 CRLF 时写回也用它，不把整个文件的换行都换掉 */
  const [usesCrlf] = useState(() => markdown.includes('\r\n'));
  /** 结构操作（删行 / 加行 / 改格）的撤销栈；文本框里的撤销仍走浏览器原生 */
  const history = useRef<MarkdownBlock[][]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 进入编辑就把焦点放到第一个可编辑块，键盘用户不用自己找
  useEffect(() => {
    const firstField =
      rootRef.current?.querySelector<HTMLElement>('textarea, input');

    firstField?.focus();
  }, []);

  /** 拼回 Markdown，并按原文件的换行风格输出 */
  const toMarkdown = (next: MarkdownBlock[]): string => {
    const text = serializeMarkdownBlocks(next);

    return usesCrlf ? text.replace(/\n/gu, '\r\n') : text;
  };

  /** 块列表变化：自己留一份，同时把拼好的 Markdown 交给弹窗当草稿 */
  const handleChange = (next: MarkdownBlock[]) => {
    history.current = [...history.current.slice(-(UNDO_DEPTH - 1)), blocks];
    setBlocks(next);
    onChange(toMarkdown(next));
  };

  /** 撤销上一步结构改动 */
  const undo = () => {
    const previous = history.current.at(-1);

    if (!previous) {
      return;
    }

    history.current = history.current.slice(0, -1);
    setBlocks(previous);
    onChange(toMarkdown(previous));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isUndoKey =
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z';

    // 在文本框里按 Ctrl/⌘+Z 是浏览器自己的撤销，不要抢
    if (!isUndoKey || isTypingTarget(event.target)) {
      return;
    }

    event.preventDefault();
    undo();
  };

  return (
    <div className={styles.editor} onKeyDown={handleKeyDown} ref={rootRef}>
      <BlockEditor blocks={blocks} onChange={handleChange} />
    </div>
  );
};

export default NoteEditor;
