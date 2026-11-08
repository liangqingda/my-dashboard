/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + ← / → 快捷键）、
 * 弹窗左侧固定的标题目录 sidebar（文档内 h1–h4 目录，随弹窗高度拉伸、目录自身滚动，
 * 滚动正文时跟随高亮当前小节）、header 右侧的全屏按钮（把整个框体铺满视口放大阅读空间，
 * 再点一次或按 Esc 退出），以及 footer 的编辑 / 预览 / 保存 / 关闭操作。
 * 组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 *
 * 这里的职责只有 Modal 骨架与装配：
 * - 标题目录 sidebar → `outline-nav`
 * - footer 与二次确认 → `footer`
 * - 编辑态状态机 → `hooks/use-note-editing`
 * - 翻篇快捷键 → `hooks/use-arrow-navigation`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Modal, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
  IconRefresh,
} from '@tabler/icons-react';
import Markdown from 'react-markdown';

import { cx } from '@/utils/cx';
import { getErrorMessage } from '@/utils/error';
import { extractMarkdownOutline } from '@/utils/markdown-outline';

import type { MarkdownPreviewModalProps } from './types';
import PreviewFooter from './Footer';
import OutlineNav from './OutlineNav';
import { HEADING_SELECTOR, REHYPE_PLUGINS, REMARK_PLUGINS } from './constants';
import { useActiveHeadingIndex } from './hooks/useActiveHeadingIndex';
import { useArrowNavigation } from './hooks/useArrowNavigation';
import { useNoteEditing } from './hooks/useNoteEditing';

import styles from './index.scss';

export type {
  MarkdownEditorProps,
  MarkdownPreviewModalProps,
} from './types';

const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  position,
  onClose,
  onPrevious,
  onNext,
  onRefresh,
  onSave,
  Editor,
}: MarkdownPreviewModalProps) => {
  const bodyRef = useRef<HTMLElement | null>(null);
  /**
   * 正文节点同时存一份 state：弹窗内容比 header 晚一帧挂载，
   * 滚动跟踪和高度测量都要等节点真正挂上再建监听，只靠 ref 会在 ref 还空时跑完 effect。
   */
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  /** 全屏预览：整个框体铺满视口，正文与目录的排布不变，只是可读空间变大 */
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /** 关闭弹窗时一并退出全屏：下次打开回到常规大小，不会一进来就铺满 */
  const handleClose = useCallback(() => {
    setFullscreen(false);
    onClose();
  }, [onClose]);

  const editing = useNoteEditing({
    hasEditor: Boolean(Editor),
    markdown,
    onClose: handleClose,
    onSave,
  });

  // 全屏时才监听 Esc：这时按 Esc 是「退出全屏」而不是「关闭弹窗」
  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }

    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    };

    window.addEventListener('keydown', exitOnEscape);

    return () => window.removeEventListener('keydown', exitOnEscape);
  }, [fullscreen]);

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
  /** 正文渲染出来后才能测量 / 跟踪标题：编辑态只有草稿预览时满足 */
  const navigable = opened && (!editing.editing || showingDraftPreview);

  useArrowNavigation({
    enabled: opened && !editing.editing,
    onNext,
    onPrevious,
  });

  /** 滚动正文时跟踪当前小节，供标题目录高亮 */
  const activeIndex = useActiveHeadingIndex({
    container: bodyElement,
    enabled: navigable,
    headings: outline,
  });

  /**
   * 正文节点的 callback ref：ref 对象给需要即时读取的地方用，
   * state 负责在节点挂载 / 卸载时触发依赖它的 effect 重建。
   */
  const attachBody = useCallback((node: HTMLElement | null) => {
    bodyRef.current = node;
    setBodyElement(node);
  }, []);

  /** 重新取一次最新正文：失败时给出可见提示（不静默吞掉），并收起 loading */
  const handleRefresh = () => {
    if (!onRefresh) {
      return;
    }

    setRefreshing(true);
    void Promise.resolve()
      .then(() => onRefresh())
      .catch((err: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(err, '请稍后再试'),
          title: '刷新预览失败',
        });
      })
      .finally(() => setRefreshing(false));
  };

  /** 跳到文档内第 index 个标题 */
  const scrollToHeading = (index: number) => {
    const body = bodyRef.current;

    if (!navigable || !body) {
      return;
    }

    const headings = body.querySelectorAll(HEADING_SELECTOR);

    if (index < 0 || index >= headings.length) {
      return;
    }

    headings[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      onClose={editing.requestClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      padding={0}
      radius="md"
      size="min(980px, 92vw)"
      title={
        <div className={styles.titleRow}>
          <ActionIcon
            aria-label="上一篇"
            className={styles.stepButton}
            disabled={!onPrevious || editing.editing}
            onClick={onPrevious ?? undefined}
            size="sm"
            variant="subtle"
          >
            <IconChevronLeft size={16} stroke={1.9} />
          </ActionIcon>
          <ActionIcon
            aria-label="下一篇"
            className={styles.stepButton}
            disabled={!onNext || editing.editing}
            onClick={onNext ?? undefined}
            size="sm"
            variant="subtle"
          >
            <IconChevronRight size={16} stroke={1.9} />
          </ActionIcon>
          {position ? (
            <span className={styles.position}>
              {position.index} / {position.total}
            </span>
          ) : null}
          <span className={styles.fileName}>{title}</span>
          {onRefresh ? (
            <ActionIcon
              aria-label="刷新预览内容"
              className={styles.refreshButton}
              disabled={editing.editing}
              loading={refreshing}
              onClick={handleRefresh}
              size="sm"
              title="重新读取最新内容"
              variant="subtle"
            >
              <IconRefresh size={15} stroke={1.9} />
            </ActionIcon>
          ) : null}
          <span className={styles.titleGap} />
          <Tooltip
            label={fullscreen ? '退出全屏（Esc）' : '全屏预览'}
            withArrow
          >
            <ActionIcon
              aria-label={fullscreen ? '退出全屏预览' : '全屏预览'}
              className={styles.fullscreenButton}
              onClick={() => setFullscreen(!fullscreen)}
              size="sm"
              variant="subtle"
            >
              {fullscreen ? (
                <IconMinimize size={15} stroke={1.9} />
              ) : (
                <IconMaximize size={15} stroke={1.9} />
              )}
            </ActionIcon>
          </Tooltip>
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
    >
      {/*
       * 正文工作区：左侧标题目录固定占一列，右侧是阅读 / 编辑区。
       * 两侧各占一列、各自滚动，所以目录不会跟着正文滚走，也不用再拿正文高度去封顶。
       */}
      <div className={styles.workspace}>
        <OutlineNav
          activeIndex={activeIndex}
          disabled={!navigable}
          headings={outline}
          onSelect={scrollToHeading}
        />
        <div className={styles.pane}>
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
              <Editor markdown={markdown} onChange={editing.setDraft} />
            </div>
          ) : null}

          {!editing.editing || showingDraftPreview ? (
            <article
              className={cx(styles.prose, fullscreen && styles.proseWide)}
              ref={attachBody}
            >
              {bodyContent}
            </article>
          ) : null}
        </div>
      </div>

      <PreviewFooter
        askDiscard={editing.askDiscard}
        canEdit={Boolean(onSave)}
        editing={editing.editing}
        onCancelEdit={editing.stopEditing}
        onDiscard={editing.discardAndClose}
        onKeepEditing={editing.keepEditing}
        onRequestClose={editing.requestClose}
        onSaveEdit={() => {
          void editing.save();
        }}
        onStartEdit={editing.startEditing}
        onStartPreview={editing.startPreview}
        onStopPreview={editing.stopPreview}
        previewing={editing.previewing}
        saveError={editing.saveError}
        saveNotice={editing.saveNotice}
        savedAt={editing.savedAt}
        saving={editing.saving}
      />
    </Modal>
  );
};

export default MarkdownPreviewModal;
