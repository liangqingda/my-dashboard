/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + ← / → 快捷键）、
 * 弹窗左上角悬浮在框体之外的标题导航（文档内 h1–h4 目录），以及 footer 的
 * 编辑 / 关闭操作。组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 *
 * 这里的职责只有 Modal 骨架与装配：
 * - 标题导航 → `outline-nav`
 * - footer 与二次确认 → `footer`
 * - 编辑态状态机 → `hooks/use-note-editing`
 * - 翻篇快捷键 → `hooks/use-arrow-navigation`
 */

import { useMemo, useRef, useState } from 'react';
import { ActionIcon, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@tabler/icons-react';
import Markdown from 'react-markdown';

import { getErrorMessage } from '@/utils/error';
import { extractMarkdownOutline } from '@/utils/markdown-outline';

import type { MarkdownPreviewModalProps } from './types';
import PreviewFooter from './Footer';
import OutlineNav from './OutlineNav';
import {
  HEADING_SELECTOR,
  REHYPE_PLUGINS,
  REMARK_PLUGINS,
} from './constants';
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
  const [refreshing, setRefreshing] = useState(false);
  const editing = useNoteEditing({
    hasEditor: Boolean(Editor),
    markdown,
    onClose,
    onSave,
  });
  /** 标题只在正文变化时重算，弹窗内部的其它状态变化不必重扫全文 */
  const outline = useMemo(
    () => extractMarkdownOutline(markdown),
    [markdown],
  );

  useArrowNavigation({
    enabled: opened && !editing.editing,
    onNext,
    onPrevious,
  });

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

    if (editing.editing || !body) {
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
        content: styles.content,
        header: styles.header,
        title: styles.title,
      }}
      closeButtonProps={{ 'aria-label': '关闭预览' }}
      onClose={editing.requestClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      padding={0}
      radius="md"
      size="min(980px, 92vw)"
      title={
        <div className={styles.titleRow}>
          <OutlineNav
            disabled={editing.editing}
            headings={outline}
            onSelect={scrollToHeading}
          />
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
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
    >
      {editing.editing && Editor ? (
        <Editor markdown={markdown} onChange={editing.setDraft} />
      ) : (
        <article className={styles.prose} ref={bodyRef}>
          <Markdown
            rehypePlugins={REHYPE_PLUGINS}
            remarkPlugins={REMARK_PLUGINS}
          >
            {markdown}
          </Markdown>
        </article>
      )}

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
        saveError={editing.saveError}
        saveNotice={editing.saveNotice}
        savedAt={editing.savedAt}
        saving={editing.saving}
      />
    </Modal>
  );
};

export default MarkdownPreviewModal;
