/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + ← / → 快捷键）、
 * 弹窗左侧固定的标题目录 sidebar（文档内 h1–h4 目录，随弹窗高度拉伸、目录自身滚动，
 * 滚动正文时跟随高亮当前小节）、header 右侧的一排操作：复制文档的相对路径（调用方给路径）、
 * 全屏预览（把整个框体铺满视口放大阅读空间，再点一次或按 Esc 退出）
 * 与编辑 / 预览 / 保存 / 放弃改动，全部只留图标 + tooltip。
 * 组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 *
 * 这里的职责只有 Modal 骨架与装配：
 * - 标题栏一行（翻篇 / 计数 / 文件名 / 复制路径 / 刷新 / 全屏）→ `title-bar`
 * - 标题目录 sidebar → `outline-nav`
 * - header 右侧的操作与状态提示 → `header-actions`
 * - 编辑态状态机 → `hooks/use-note-editing`
 * - 翻篇快捷键 → `hooks/use-arrow-navigation`
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Loader, Modal } from '@mantine/core';
import Markdown from 'react-markdown';

import { cx } from '@/utils/cx';
import { extractMarkdownOutline } from '@/utils/markdown-outline';

import type {
  MarkdownEditorHandle,
  MarkdownPreviewModalProps,
} from './types';
import TitleBar from './TitleBar';
import OutlineNav from './OutlineNav';
import { HEADING_SELECTOR, REHYPE_PLUGINS, REMARK_PLUGINS } from './constants';
import { useActiveHeadingIndex } from './hooks/useActiveHeadingIndex';
import { useArrowNavigation } from './hooks/useArrowNavigation';
import { useCloseRequest } from './hooks/useCloseRequest';
import { useDocumentScrollReset } from './hooks/useDocumentScrollReset';
import { useModalFullscreen } from './hooks/useModalFullscreen';
import { useRefreshPreview } from './hooks/useRefreshPreview';
import { useNoteEditing } from './hooks/useNoteEditing';

import styles from './index.scss';

export type {
  MarkdownEditorHandle,
  MarkdownEditorProps,
  MarkdownPreviewModalProps,
} from './types';

const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  loading = false,
  position,
  relativePath,
  onClose,
  onPrevious,
  onNext,
  onRefresh,
  onSave,
  Editor,
}: MarkdownPreviewModalProps) => {
  const bodyRef = useRef<HTMLElement | null>(null);
  /** 编辑态正文不渲染，目录定位靠定制编辑器交上来的 `revealHeading` */
  const editorHandleRef = useRef<MarkdownEditorHandle | null>(null);
  /** 编辑态目录的激活项：最近一次跳到的标题（正文没渲染，算不出滚动位置） */
  const [editorActiveIndex, setEditorActiveIndex] = useState(-1);
  /** 编辑器交上来的句柄只放 ref：目录点击时读，不需要触发重渲染 */
  const attachEditorHandle = useCallback(
    (handle: MarkdownEditorHandle | null) => {
      editorHandleRef.current = handle;
    },
    [],
  );
  /**
   * 正文节点同时存一份 state：弹窗内容比 header 晚一帧挂载，
   * 滚动跟踪和高度测量都要等节点真正挂上再建监听，只靠 ref 会在 ref 还空时跑完 effect。
   */
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  /** 全屏开关与全屏时的 Esc 语义都在这个 hook 里；它是记住的偏好，关闭弹窗也不重置 */
  const { fullscreen, toggle: toggleFullscreen } = useModalFullscreen();

  /** 刷新按钮的 loading 与失败提示都在这个 hook 里 */
  const { refresh, refreshing } = useRefreshPreview(onRefresh);

  const editing = useNoteEditing({
    documentTitle: title,
    hasEditor: Boolean(Editor),
    markdown,
    onSave,
  });

  /** 关闭请求：编辑态（含草稿预览）不关，只提示先退出编辑，其余照常关 */
  const requestClose = useCloseRequest({
    blocking: editing.editing,
    onClose,
    previewing: editing.previewing,
  });

  /** 进入编辑时清掉目录激活项：新的一轮不该还亮着上一轮跳到的位置 */
  const startEditing = () => {
    setEditorActiveIndex(-1);
    editing.startEditing();
  };

  /** 编辑态里点了「预览」：正文换成草稿的渲染结果，编辑器还挂在原地 */
  const showingDraftPreview = editing.editing && editing.previewing;
  /** 正文区当前要渲染的内容：预览草稿时用草稿，其余用正文 */
  const renderedMarkdown =
    showingDraftPreview && editing.draft !== null ? editing.draft : markdown;
  /** 标题只在正文变化时重算，弹窗内部的其它状态变化不必重扫全文 */
  const outline = useMemo(
    () => extractMarkdownOutline(renderedMarkdown),
    [renderedMarkdown],
  );
  /**
   * 正文只随内容重建：`react-markdown` 每次渲染都会重新解析整篇（长文档几十毫秒），
   * 弹窗内部状态（正文节点挂载、刷新、编辑态切换）变化时不该再解析一遍。
   */
  const bodyContent = useMemo(
    () => (
      <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
        {renderedMarkdown}
      </Markdown>
    ),
    [renderedMarkdown],
  );
  /** 正文渲染出来后才能测量 / 跟踪标题：编辑态只有草稿预览时满足；正文还在取时什么都没有 */
  const bodyReady =
    opened && !loading && (!editing.editing || showingDraftPreview);

  useArrowNavigation({
    enabled: opened && !editing.editing && !loading,
    onNext,
    onPrevious,
  });

  /** 滚动正文时跟踪当前小节，供标题目录高亮 */
  const activeIndex = useActiveHeadingIndex({
    container: bodyElement,
    enabled: bodyReady,
    headings: outline,
  });

  /** 换篇 / 重新打开时正文回到顶部：弹窗不再按篇重挂，不复位就把上一篇的位置留给下一篇 */
  useDocumentScrollReset(bodyRef, title, opened);

  /**
   * 正文节点的 callback ref：ref 对象给需要即时读取的地方用，
   * state 负责在节点挂载 / 卸载时触发依赖它的 effect 重建。
   */
  const attachBody = useCallback((node: HTMLElement | null) => {
    bodyRef.current = node;
    setBodyElement(node);
  }, []);

  /**
   * 跳到第 index 个标题：编辑态跳编辑器里的块（交给编辑器定位），
   * 预览态跳渲染出来的正文节点。
   */
  const scrollToHeading = (index: number) => {
    if (!opened) {
      return;
    }

    if (editing.editing && !showingDraftPreview) {
      if (editorHandleRef.current?.revealHeading(index)) {
        setEditorActiveIndex(index);
      }

      return;
    }

    const body = bodyRef.current;

    if (!body) {
      return;
    }

    const headings = body.querySelectorAll(HEADING_SELECTOR);

    if (index < 0 || index >= headings.length) {
      return;
    }

    headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /*
   * 编辑态（含草稿预览）关不掉：关闭按钮不渲染，Esc / 点遮罩统一走 `requestClose`（不关、只提示）。
   * 唯一出口是 header 的返回箭头：草稿预览时回编辑器，编辑时退出编辑（有未保存改动先确认），
   * 退出后关闭按钮与全屏才回来。全屏也一并收掉：这时要看的是块编辑器。
   */
  return (
    <Modal
      centered
      classNames={{
        body: styles.body,
        content: cx(styles.content, fullscreen && styles.contentFullscreen),
        header: styles.header,
        title: styles.title,
      }}
      closeButtonProps={{ 'aria-label': '关闭预览' }}
      closeOnEscape={!fullscreen}
      fullScreen={fullscreen}
      onClose={requestClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      padding={0}
      radius="md"
      size="min(980px, 92vw)"
      title={
        <TitleBar
          canEdit={Boolean(onSave) && !loading}
          editing={editing}
          fullscreen={fullscreen}
          onNext={onNext}
          onPrevious={onPrevious}
          onRefresh={onRefresh && !loading ? refresh : null}
          onStartEdit={startEditing}
          onToggleFullscreen={toggleFullscreen}
          position={position}
          refreshing={refreshing}
          relativePath={relativePath}
          title={title}
        />
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
      withCloseButton={!editing.editing}
    >
      {/*
       * 正文工作区：左侧标题目录固定占一列，右侧是阅读 / 编辑区。
       * 两侧各占一列、各自滚动，所以目录不会跟着正文滚走，也不用再拿正文高度去封顶。
       */}
      <div className={styles.workspace}>
        <OutlineNav
          activeIndex={bodyReady ? activeIndex : editorActiveIndex}
          disabled={!opened || loading}
          fullscreen={fullscreen}
          headings={outline}
          onSelect={scrollToHeading}
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

          {!loading && (!editing.editing || showingDraftPreview) ? (
            <article
              className={cx(styles.prose, fullscreen && styles.proseWide)}
              ref={attachBody}
            >
              {bodyContent}
            </article>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default MarkdownPreviewModal;
