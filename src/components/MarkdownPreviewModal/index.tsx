import { useEffect } from 'react';
import { ActionIcon, Modal } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import styles from './index.scss';

/** 固定引用，避免每次渲染重建插件数组 */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw];

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
};

/**
 * Markdown 预览弹窗（公共组件）。
 *
 * 全站所有 Markdown 弹窗预览都必须使用这个组件，不要各自拼装 Modal 与渲染器：
 * 它统一了文档排版、上一篇 / 下一篇导航（弹窗左上角悬浮按钮 + header 图标按钮 +
 * ← / → 快捷键）以及键盘可访问性。导航逻辑由调用方决定，组件只负责触发回调。
 */
const MarkdownPreviewModal = ({
  opened,
  title,
  markdown,
  position,
  onClose,
  onPrevious,
  onNext,
}: MarkdownPreviewModalProps) => {
  useEffect(() => {
    if (!opened) {
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
  }, [opened, onPrevious, onNext]);

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
      onClose={onClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      padding={0}
      radius="md"
      size="min(980px, 92vw)"
      title={
        <div className={styles.titleRow}>
          <div className={styles.floatNav}>
            <ActionIcon
              aria-label="上一篇"
              className={styles.floatButton}
              disabled={!onPrevious}
              onClick={onPrevious ?? undefined}
              radius="sm"
              size="lg"
              title="上一篇（←）"
              variant="default"
            >
              <IconChevronLeft size={18} stroke={1.9} />
            </ActionIcon>
            <ActionIcon
              aria-label="下一篇"
              className={styles.floatButton}
              disabled={!onNext}
              onClick={onNext ?? undefined}
              radius="sm"
              size="lg"
              title="下一篇（→）"
              variant="default"
            >
              <IconChevronRight size={18} stroke={1.9} />
            </ActionIcon>
          </div>
          <span className={styles.fileName}>{title}</span>
          <span className={styles.trailing}>
            {position ? (
              <span className={styles.position}>
                {position.index} / {position.total}
              </span>
            ) : null}
            <ActionIcon
              aria-label="上一篇"
              className={styles.headerButton}
              disabled={!onPrevious}
              onClick={onPrevious ?? undefined}
              size="sm"
              variant="subtle"
            >
              <IconChevronLeft size={16} stroke={1.9} />
            </ActionIcon>
            <ActionIcon
              aria-label="下一篇"
              className={styles.headerButton}
              disabled={!onNext}
              onClick={onNext ?? undefined}
              size="sm"
              variant="subtle"
            >
              <IconChevronRight size={16} stroke={1.9} />
            </ActionIcon>
          </span>
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
    >
      <article className={styles.prose}>
        <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
          {markdown}
        </Markdown>
      </article>
    </Modal>
  );
};

export default MarkdownPreviewModal;
