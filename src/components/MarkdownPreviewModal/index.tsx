import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ActionIcon, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { extractMarkdownOutline } from '@/utils/markdown-outline';

import styles from './index.scss';

/** 「已保存」提示停留时长 */
const SAVED_HINT_DURATION = 3000;

/** 取当前时刻的 HH:MM，用于「已保存」提示 */
const formatClock = (date: Date): string =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
  }).format(date);

/** 没有定制编辑器时的提示：告诉用户可以去定制，而不是不给入口 */
const NO_EDITOR_MESSAGE =
  '这类 Markdown 还没有定制编辑器。用 personalize-edit-markdown skill 可以为它写一套编辑逻辑。';

/** 固定引用，避免每次渲染重建插件数组 */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw];

/** 定制编辑器收到的入参与出口：正文快照 + 草稿回传 */
export type MarkdownEditorProps = {
  /** 进入编辑时的正文快照 */
  markdown: string;
  /** 编辑过程中的草稿；弹窗保存时取最后一次的值 */
  onChange: (markdown: string) => void;
};

export type MarkdownPreviewModalProps = {
  /** 是否打开预览 */
  opened: boolean;
  /** 标题，通常是文件名 */
  title: string;
  /** Markdown 原文 */
  markdown: string;
  /** 当前位置，如第 3 / 12 篇 */
  position?: { index: number; total: number };
  /** 关闭预览 */
  onClose: () => void;
  /** 上一篇；null 表示没有相邻文档 */
  onPrevious?: (() => void) | null;
  /** 下一篇；null 表示没有相邻文档 */
  onNext?: (() => void) | null;
  /** 保存编辑后的 Markdown；提供后 footer 才会出现「编辑」 */
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
  /**
   * 这一类 Markdown 的定制编辑器。不传则点「编辑」只给出定制提示——
   * 通用组件不假设任何文档结构，编辑逻辑归调用方（见 personalize-edit-markdown）。
   */
  Editor?: ComponentType<MarkdownEditorProps>;
};

/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + ← / → 快捷键）、
 * 弹窗左上角悬浮在框体之外的标题导航（文档内 h1–h3 目录），以及 footer 的
 * 编辑 / 关闭操作。组件只负责编辑态与保存流程，不知道文档结构和文件落在哪里：
 * 具体怎么编辑由调用方通过 `Editor` 插槽传入，没有定制编辑器时给出定制提示。
 */
const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  position,
  onClose,
  onPrevious,
  onNext,
  onSave,
  Editor,
}: MarkdownPreviewModalProps) => {
  const bodyRef = useRef<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 非 null 即编辑态；值就是当前草稿 */
  const [draft, setDraft] = useState<string | null>(null);
  /** 保存成功后的短暂提示时刻，如 20:54 */
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** 提示后面追加的说明，如自动提交失败原因 */
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  /** 有未保存改动时，关闭要二次确认 */
  const [askDiscard, setAskDiscard] = useState(false);
  /** 「已保存」提示的定时器句柄，连续保存时先清掉上一个 */
  const savedTimer = useRef<number | null>(null);
  const editing = draft !== null;
  /** 草稿和进来的正文不一样，才算有改动 */
  const dirty = draft !== null && draft !== markdown;
  const outline = extractMarkdownOutline(markdown);

  // 弹窗卸载时别留悬着的定时器
  useEffect(
    () => () => {
      if (savedTimer.current !== null) {
        window.clearTimeout(savedTimer.current);
      }
    },
    [],
  );

  /** 显示「已保存」提示，3 秒后淡出；连续保存不会互相踩定时器 */
  const showSavedHint = (clock: string) => {
    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
    }

    setSavedAt(clock);
    savedTimer.current = window.setTimeout(() => {
      savedTimer.current = null;
      setSavedAt(null);
    }, SAVED_HINT_DURATION);
  };

  useEffect(() => {
    if (!opened || editing) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'ArrowLeft' && onPrevious) {
        event.preventDefault();
        onPrevious();

        return;
      }

      if (event.key === 'ArrowRight' && onNext) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, editing, onPrevious, onNext]);

  /** 真正关掉弹窗，并清空所有编辑态。 */
  const closeAll = () => {
    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
      savedTimer.current = null;
    }

    setDraft(null);
    setSaveError(null);
    setSavedAt(null);
    setSaveNotice(null);
    setAskDiscard(false);
    onClose();
  };

  /** 关闭入口：编辑中有未保存改动时先确认，别静默丢改动。 */
  const handleClose = () => {
    if (dirty) {
      setAskDiscard(true);

      return;
    }

    closeAll();
  };

  /** 进入编辑态：有定制编辑器才进入，没有就提示去定制。 */
  const startEditing = () => {
    if (!Editor) {
      notifications.show({
        color: 'teal',
        message: NO_EDITOR_MESSAGE,
        title: '这里还没有定制编辑器',
      });

      return;
    }

    setAskDiscard(false);
    setSaveError(null);
    setSavedAt(null);
    setSaveNotice(null);
    setDraft(markdown);
  };

  /** 退出编辑态，什么都不写回。 */
  const stopEditing = () => {
    setDraft(null);
    setSaveError(null);
  };

  /** 保存草稿；成功后回到预览态，正文等调用方刷新。 */
  const handleSave = async () => {
    if (!onSave || draft === null) {
      return;
    }

    const savedDraft = draft;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await onSave(savedDraft);

      // 保存期间用户又改了内容，就别把他的新输入一起清掉
      setDraft((current) => (current === savedDraft ? null : current));
      setAskDiscard(false);
      setSaveNotice(result.notice ?? null);
      showSavedHint(formatClock(new Date()));
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 跳到文档内第 index 个标题。 */
  const scrollToHeading = (index: number) => {
    if (editing) {
      return;
    }

    const target = bodyRef.current?.querySelectorAll('h1, h2, h3').item(index);

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** 弹窗左上角、框体之外的标题导航 */
  const outlineNav =
    outline.length > 1 ? (
      <div
        aria-disabled={editing}
        className={
          editing
            ? `${styles.outlineNav} ${styles.outlineDisabled}`
            : styles.outlineNav
        }
      >
        <ul className={styles.outlineList}>
          {outline.map((heading, index) => (
            <li key={heading.key}>
              <button
                className={styles.outlineItem}
                data-level={heading.level}
                disabled={editing}
                onClick={() => scrollToHeading(index)}
                title={heading.text}
                type="button"
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

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
      onClose={handleClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      padding={0}
      radius="md"
      size="min(980px, 92vw)"
      title={
        <div className={styles.titleRow}>
          {outlineNav}
          <ActionIcon
            aria-label="上一篇"
            className={styles.stepButton}
            disabled={!onPrevious || editing}
            onClick={onPrevious ?? undefined}
            size="sm"
            variant="subtle"
          >
            <IconChevronLeft size={16} stroke={1.9} />
          </ActionIcon>
          <ActionIcon
            aria-label="下一篇"
            className={styles.stepButton}
            disabled={!onNext || editing}
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
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
    >
      {editing && Editor ? (
        <Editor markdown={markdown} onChange={setDraft} />
      ) : (
        <article className={styles.prose} ref={bodyRef}>
          <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
            {markdown}
          </Markdown>
        </article>
      )}

      <footer className={styles.footer}>
        {saveError && !askDiscard ? (
          <span className={styles.saveError}>{saveError}</span>
        ) : null}
        {askDiscard ? (
          <span className={styles.unsavedHint}>这份改动还没保存</span>
        ) : null}
        {savedAt && !saveError && !askDiscard ? (
          <span className={styles.savedHint}>
            已保存・{savedAt}
            {saveNotice ? `・${saveNotice}` : ''}
          </span>
        ) : null}
        <div className={styles.actions}>
          {askDiscard ? (
            <>
              <button
                className={styles.footerButton}
                onClick={() => setAskDiscard(false)}
                type="button"
              >
                继续编辑
              </button>
              <button
                className={`${styles.footerButton} ${styles.footerButtonDanger}`}
                onClick={closeAll}
                type="button"
              >
                放弃并关闭
              </button>
            </>
          ) : null}
          {!askDiscard && editing ? (
            <>
              <button
                className={styles.footerButton}
                disabled={saving}
                onClick={stopEditing}
                type="button"
              >
                取消
              </button>
              <button
                className={`${styles.footerButton} ${styles.footerButtonPrimary}`}
                disabled={saving}
                onClick={() => {
                  void handleSave();
                }}
                type="button"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          ) : null}
          {!askDiscard && !editing ? (
            <>
              {onSave ? (
                <button
                  className={styles.footerButton}
                  onClick={startEditing}
                  type="button"
                >
                  编辑
                </button>
              ) : null}
              <button
                className={styles.footerButton}
                onClick={handleClose}
                type="button"
              >
                关闭
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </Modal>
  );
};

export default MarkdownPreviewModal;
