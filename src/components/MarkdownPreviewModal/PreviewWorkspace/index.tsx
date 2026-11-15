/**
 * 预览弹窗的正文工作区：左侧标题目录固定占一列，右侧是阅读 / 编辑区。
 * 两列各自滚动，所以目录不会跟着正文滚走，也不用再拿正文高度去封顶。
 *
 * 「看这一篇」的中间过程都收在这一层：筛选、正文渲染、目录提取、滚动高亮、
 * 换篇回顶与点目录定位（预览态滚正文，编辑态交给定制编辑器的 `revealHeading`）。
 * 弹窗只给原文、筛选口径与阅读偏好，不必知道这些细节。
 *
 * 样式复用弹窗自己的样式模块（`.workspace` / `.pane` / `.prose` 都在那里）：
 * 工作区是弹窗内部结构的一部分，不另立一套排版。
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Loader, Text } from '@mantine/core';
import Markdown from 'react-markdown';

import { cx } from '@/utils/cx';
import { extractMarkdownOutline } from '@/utils/markdown-outline';

import type {
  MarkdownEditorHandle,
  PreviewWorkspaceProps,
} from '../types';
import OutlineNav from '../OutlineNav';
import { REHYPE_PLUGINS, REMARK_PLUGINS } from '../constants';
import { scrollToHeading } from '../utils/prose-navigation';
import { useActiveHeadingIndex } from '../hooks/useActiveHeadingIndex';
import { useDocumentScrollReset } from '../hooks/useDocumentScrollReset';

import styles from '../index.scss';

const PreviewWorkspace = ({
  editing,
  Editor,
  filter,
  fontOffset,
  fullscreen,
  loading,
  markdown,
  onBodyClick,
  opened,
  title,
}: PreviewWorkspaceProps) => {
  /** 正文节点：滚动跟踪、换篇回顶与点目录定位都读它 */
  const bodyRef = useRef<HTMLElement | null>(null);
  /** 正文节点同时存一份 state：正文比 header 晚一帧挂载，只靠 ref 会让 effect 在 ref 还空时跑完 */
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  /** 编辑态正文不渲染，目录定位靠定制编辑器交上来的 `revealHeading` */
  const editorHandleRef = useRef<MarkdownEditorHandle | null>(null);
  /** 编辑态目录的激活项：最近一次跳到的标题（正文没渲染，算不出滚动位置） */
  const [editorActiveIndex, setEditorActiveIndex] = useState(-1);

  /** 编辑态里点了「预览」：正文换成草稿的渲染结果，编辑器还挂在原地 */
  const showingDraftPreview = editing.editing && editing.previewing;
  /**
   * 预览态真正渲染的正文：筛选只做在这一层。
   * 编辑态（含草稿预览）不筛——那时看的是「这份草稿长什么样」，
   * 而且要保证编辑器与保存拿到的始终是未筛选的原文。
   */
  const visibleMarkdown = useMemo(
    () =>
      filter && !editing.editing ? filter.apply(markdown) : markdown,
    [editing.editing, filter, markdown],
  );
  /** 筛选后一条都不剩：正文区给一句说明，而不是一片空白（原文本就空时不报「没筛到」） */
  const filterEmpty =
    Boolean(filter?.active) &&
    !loading &&
    !editing.editing &&
    markdown.trim() !== '' &&
    visibleMarkdown.trim() === '';
  /** 标题只在显示内容变化时重算，工作区内的其它状态变化不必重扫全文 */
  const outline = useMemo(
    () => extractMarkdownOutline(visibleMarkdown),
    [visibleMarkdown],
  );
  /**
   * 正文只随内容重建：`react-markdown` 每次渲染都会重新解析整篇（长文档几十毫秒），
   * 工作区内部状态（正文节点挂载、编辑态切换）变化时不该再解析一遍。
   */
  const bodyContent = useMemo(
    () => (
      <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
        {visibleMarkdown}
      </Markdown>
    ),
    [visibleMarkdown],
  );
  /** 正文渲染出来后才能测量 / 跟踪标题：编辑态只有草稿预览时满足；正文还在取时什么都没有 */
  const bodyReady = opened && !loading && (!editing.editing || showingDraftPreview);
  /** 偏移以 CSS 变量下发到正文自身，与模式默认的 `--prose-grow` 在同一条 calc 里相加 */
  const proseStyle = { '--prose-extra': `${fontOffset}px` } as CSSProperties;

  /** 滚动正文时跟踪当前小节，供标题目录高亮 */
  const activeIndex = useActiveHeadingIndex({
    container: bodyElement,
    enabled: bodyReady,
    headings: outline,
  });

  /** 换篇 / 重新打开时正文回到顶部：不复位就把上一篇的位置留给下一篇 */
  useDocumentScrollReset(bodyRef, title, opened);

  /**
   * 正文节点的 callback ref：ref 对象给需要即时读取的地方（弹窗找锚点）用，
   * state 负责在节点挂载 / 卸载时触发依赖它的 effect 重建。
   */
  const attachBody = useCallback((node: HTMLElement | null) => {
    bodyRef.current = node;
    setBodyElement(node);
  }, []);

  /** 编辑器交上来的句柄只放 ref：目录点击时读，不需要触发重渲染 */
  const attachEditorHandle = useCallback(
    (handle: MarkdownEditorHandle | null) => {
      editorHandleRef.current = handle;
    },
    [],
  );

  /**
   * 跳到第 index 个标题：编辑态跳编辑器里的块（交给编辑器定位），
   * 预览态跳渲染出来的正文节点（与子区域预览共用 `utils/prose-navigation`）。
   */
  const jumpToHeading = (index: number) => {
    if (!opened) {
      return;
    }

    if (editing.editing && !showingDraftPreview) {
      if (editorHandleRef.current?.revealHeading(index)) {
        setEditorActiveIndex(index);
      }

      return;
    }

    scrollToHeading(bodyRef.current, index);
  };

  return (
    <div className={styles.workspace}>
      <OutlineNav
        activeIndex={bodyReady ? activeIndex : editorActiveIndex}
        disabled={!opened || loading}
        fullscreen={fullscreen}
        headings={outline}
        onSelect={jumpToHeading}
      />
      <div className={styles.pane}>
        {/* 正文还在取：只放一个居中的加载指示，不渲染空 Markdown，也不给编辑入口 */}
        {loading ? (
          <div aria-busy="true" className={styles.loadingBody}>
            <Loader size="sm" />
          </div>
        ) : null}

        {/*
         * 编辑插槽在预览草稿时只隐藏、不卸载：草稿、撤销栈和光标位置都留在编辑器里，
         * 点「取消」回到编辑模式时接着改，不用把草稿重新解析一遍。
         */}
        {editing.editing && Editor ? (
          <div
            className={cx(
              styles.editorSlot,
              showingDraftPreview && styles.editorSlotHidden,
            )}
          >
            <Editor
              markdown={markdown}
              onChange={editing.setDraft}
              onHandleReady={attachEditorHandle}
            />
          </div>
        ) : null}

        {/* 筛选后没有内容：明确说一句，不留一块空白让人以为加载挂了 */}
        {filterEmpty ? (
          <div className={styles.filterEmpty}>
            <Text c="dimmed" size="sm">
              没有符合当前筛选条件的内容，换个关键词或放宽范围试试。
            </Text>
          </div>
        ) : null}

        {bodyReady && !filterEmpty ? (
          <article
            className={cx(styles.prose, fullscreen && styles.proseFullscreen)}
            onClick={onBodyClick}
            ref={attachBody}
            style={proseStyle}
          >
            {bodyContent}
          </article>
        ) : null}
      </div>
    </div>
  );
};

export default PreviewWorkspace;
