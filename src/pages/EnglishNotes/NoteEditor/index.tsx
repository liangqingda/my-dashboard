import { useEffect, useRef, useState } from 'react';

import type { MarkdownEditorProps } from '@/components/modals/MarkdownPreviewModal';
import { isTypingTarget } from '@/utils/typing-target';

import type { MarkdownBlock } from '../types';
import BlockEditor from '../BlockEditor';
import { UNDO_BYTES_LIMIT, UNDO_DEPTH } from '../constants';
import { findBlockIndexForHeading } from '../utils/heading-block';
import {
  blocksToMarkdown,
  parseMarkdownBlocks,
} from '../utils/markdown-blocks';

import styles from './index.scss';

/**
 * 把某个块滚进视野并聚焦它的第一个可编辑控件。
 * 块元素靠 `data-block-index` 找：块的 DOM 顺序由 BlockEditor 决定，这里不猜层级。
 */
const focusBlock = (root: HTMLElement | null, blockIndex: number): boolean => {
  const node = root?.querySelector<HTMLElement>(
    `[data-block-index="${blockIndex}"]`,
  );

  if (!node) {
    return false;
  }

  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // 聚焦时不要再滚一次，否则会把刚起的平滑滚动打断在块中间
  node.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true });

  return true;
};

/**
 * 一份撤销快照：块数组 + 这份正文的字节数（按 Markdown 原文计，用来按总量裁剪）。
 * 存字节数而不是每次裁剪时重新序列化：一份快照就是一份完整正文，量一次就够了。
 */
type UndoEntry = {
  blocks: MarkdownBlock[];
  bytes: number;
};

/**
 * 把一份快照入栈：先按步数、再按总字节裁剪，至少留一步可撤。
 * 只按步数封顶会让长笔记的撤销栈随篇幅线性吃内存，按字节封顶才能跟篇幅解耦。
 */
const pushUndo = (stack: UndoEntry[], entry: UndoEntry): UndoEntry[] => {
  const next = [...stack, entry];
  let bytes = next.reduce((total, item) => total + item.bytes, 0);
  let drop = 0;

  while (
    next.length - drop > 1 &&
    (next.length - drop > UNDO_DEPTH || bytes > UNDO_BYTES_LIMIT)
  ) {
    bytes -= next[drop].bytes;
    drop += 1;
  }

  return drop > 0 ? next.slice(drop) : next;
};

/**
 * 学习笔记专用编辑器：进编辑时把正文切成块，表格走受控网格，其余块编辑源码片段。
 *
 * 这是「定制编辑」的参考实现——公共组件只提供插槽，笔记长什么样、怎么改回文本，
 * 都由这一类文档自己说了算。换成按块重拼，只会在保存时重排一次格式。
 *
 * 同时实现 `handleRef` 这条可选能力：编辑态正文不渲染，弹窗的标题目录靠它把对应块滚进视野。
 */
const NoteEditor = ({
  markdown,
  onChange,
  onHandleReady,
}: MarkdownEditorProps) => {
  const [blocks, setBlocks] = useState<MarkdownBlock[]>(() =>
    parseMarkdownBlocks(markdown),
  );
  /** 原文件用 CRLF 时写回也用它，不把整个文件的换行都换掉 */
  const [usesCrlf] = useState(() => markdown.includes('\r\n'));
  /** 单元格 / 文本改动的撤销栈；文本框里的撤销仍走浏览器原生 */
  const history = useRef<UndoEntry[]>([]);
  /** 当前草稿的字节数：入栈时给「上一份」记权重，裁剪时不必再序列化一遍 */
  const draftBytes = useRef(markdown.length);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 进入编辑就把焦点放到第一个可编辑块，键盘用户不用自己找
  useEffect(() => {
    const firstField =
      rootRef.current?.querySelector<HTMLElement>('textarea, input');

    firstField?.focus();
  }, []);

  /**
   * 把「跳到某一节」交给弹窗：编辑态正文不渲染，目录只能由编辑器定位。
   * 每次块变动重交一份——定位依赖最新的块顺序。
   */
  useEffect(() => {
    if (!onHandleReady) {
      return undefined;
    }

    onHandleReady({
      revealHeading: (index) => {
        const blockIndex = findBlockIndexForHeading(blocks, index);

        return blockIndex === -1
          ? false
          : focusBlock(rootRef.current, blockIndex);
      },
    });

    return () => onHandleReady(null);
  }, [blocks, onHandleReady]);

  /** 块列表变化：自己留一份，同时把拼好的 Markdown 交给弹窗当草稿 */
  const handleChange = (next: MarkdownBlock[]) => {
    const draft = blocksToMarkdown(next, usesCrlf);

    history.current = pushUndo(history.current, {
      blocks,
      bytes: draftBytes.current,
    });
    draftBytes.current = draft.length;

    setBlocks(next);
    onChange(draft);
  };

  /** 撤销上一步结构改动 */
  const undo = () => {
    const previous = history.current.at(-1);

    if (!previous) {
      return;
    }

    history.current = history.current.slice(0, -1);
    draftBytes.current = previous.bytes;
    setBlocks(previous.blocks);
    onChange(blocksToMarkdown(previous.blocks, usesCrlf));
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
