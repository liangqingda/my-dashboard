import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Modal } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconList } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import styles from './index.scss';

/** 固定引用，避免每次渲染重建插件数组 */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw];

/** 标题导航收录的最深层级 */
const MAX_HEADING_LEVEL = 3;

/** 用于渲染的标题信息 */
type OutlineHeading = {
  /** 层级：1 / 2 / 3 */
  level: number;
  /** 纯文本标题 */
  text: string;
  /** 稳定 key：同名标题按出现次序区分 */
  key: string;
};

/** 去掉标题里的内联 Markdown 标记，留住可读文本。 */
const stripInlineMarkup = (text: string): string =>
  text
    .replace(/<\/?[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim();

/** 抽取文档内的 h1–h3，作为按书写顺序排列的标题导航。 */
const extractOutline = (markdown: string): OutlineHeading[] => {
  const { headings } = markdown.split('\n').reduce<{
    headings: OutlineHeading[];
    inCode: boolean;
  }>(
    (acc, line) => {
      const trimmed = line.trimStart();

      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        return { headings: acc.headings, inCode: !acc.inCode };
      }

      if (acc.inCode) {
        return acc;
      }

      const match = /^(#{1,3})\s+(.+)$/u.exec(line);

      if (!match) {
        return acc;
      }

      const level = match[1].length;

      if (level > MAX_HEADING_LEVEL) {
        return acc;
      }

      const text = stripInlineMarkup(match[2]);

      if (!text) {
        return acc;
      }

      const occurrence = acc.headings.filter(
        (item) => item.text === text,
      ).length;

      return {
        headings: [
          ...acc.headings,
          { level, text, key: `${level}:${text}:${occurrence}` },
        ],
        inCode: acc.inCode,
      };
    },
    { headings: [], inCode: false },
  );

  return headings;
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
  onSave?: (markdown: string) => Promise<void>;
};

/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（header 标题左侧按钮 + ← / → 快捷键）、
 * 弹窗左上角悬浮在框体之外的标题导航（文档内 h1–h3 目录），以及 footer 的
 * 编辑 / 关闭操作。编辑能力由调用方的 onSave 提供，组件只负责编辑态与保存流程，
 * 不知道文件落在哪里。
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
}: MarkdownPreviewModalProps) => {
  const bodyRef = useRef<HTMLElement | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const outline = extractOutline(markdown);

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

  /** 关掉弹窗，同时退出编辑态。 */
  const handleClose = () => {
    setEditing(false);
    setSaveError(null);
    onClose();
  };

  /** 进入编辑态，草稿从当前正文开始。 */
  const startEditing = () => {
    setDraft(markdown);
    setSaveError(null);
    setEditing(true);
  };

  /** 保存草稿；成功后回到预览态，正文等调用方刷新。 */
  const handleSave = async () => {
    if (!onSave) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(draft);
      setEditing(false);
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
      <div className={styles.outlineNav}>
        <button
          aria-expanded={outlineOpen}
          aria-label="标题导航"
          className={styles.outlineToggle}
          onClick={() => setOutlineOpen((open) => !open)}
          type="button"
        >
          <IconList size={14} stroke={1.8} />
          <span>目录</span>
        </button>
        {outlineOpen ? (
          <ul className={styles.outlineList}>
            {outline.map((heading, index) => (
              <li key={heading.key}>
                <button
                  className={styles.outlineItem}
                  data-level={heading.level}
                  onClick={() => scrollToHeading(index)}
                  title={heading.text}
                  type="button"
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
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
      {editing ? (
        <textarea
          aria-label="编辑 Markdown"
          className={styles.editor}
          onChange={(event) => setDraft(event.currentTarget.value)}
          spellCheck={false}
          value={draft}
        />
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

      <footer className={styles.footer}>
        {saveError ? <span className={styles.saveError}>{saveError}</span> : null}
        <div className={styles.actions}>
          {editing ? (
            <>
              <Button
                disabled={saving}
                onClick={() => setEditing(false)}
                radius="sm"
                size="compact-sm"
                variant="subtle"
              >
                取消
              </Button>
              <Button
                loading={saving}
                onClick={() => {
                  void handleSave();
                }}
                radius="sm"
                size="compact-sm"
                variant="filled"
              >
                保存
              </Button>
            </>
          ) : (
            <>
              {onSave ? (
                <Button
                  onClick={startEditing}
                  radius="sm"
                  size="compact-sm"
                  variant="subtle"
                >
                  编辑
                </Button>
              ) : null}
              <Button
                onClick={handleClose}
                radius="sm"
                size="compact-sm"
                variant="default"
              >
                关闭
              </Button>
            </>
          )}
        </div>
      </footer>
    </Modal>
  );
};

export default MarkdownPreviewModal;
