/**
 * 子区域预览弹窗：把正文里某一段（同文档链接指向的那一节）单独开窗阅读。
 *
 * 只做「一块内容的阅读」，不做整篇的事：
 * - header：前后切换同一篇里被链接指向的区块（按正文顺序、不区分层级）、计数与区块标题，
 *   右侧只有正文字号、全屏与关闭；
 * - 左侧：这一块自己的标题目录（复用 `OutlineNav`）；
 * - 正文：这一块的源文本，阅读偏好（字号 / 全屏）与主预览共用同一份记住的值。
 *
 * 排版样式直接复用主预览的样式模块：同一套 `.prose` 规则维护两份，迟早会漂。
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Modal } from '@mantine/core';
import Markdown from 'react-markdown';

import { cx } from '@/utils/cx';
import type { MarkdownOutlineHeading } from '@/utils/markdown-outline';

import type { AnchorBlockModalProps } from '../types';
import OutlineNav from '../OutlineNav';
import ProseFontControl from '../ProseFontControl';
import { REHYPE_PLUGINS, REMARK_PLUGINS } from '../constants';
import { getClickedAnchor, scrollToAnchor, scrollToHeading } from '../utils/prose-navigation';
import { useActiveHeadingIndex } from '../hooks/useActiveHeadingIndex';
import { useDocumentScrollReset } from '../hooks/useDocumentScrollReset';
import { useModalFullscreen } from '../hooks/useModalFullscreen';
import { useProseFontScale } from '../hooks/useProseFontScale';

import AnchorBlockHeader from './Header';

import previewStyles from '../index.scss';
import styles from './index.scss';

/** 稳定的空标题列表：没打开时目录不该因为一个新数组而重算 */
const NO_HEADINGS: MarkdownOutlineHeading[] = [];

const AnchorBlockModal = ({
  block,
  onClose,
  onNext,
  onPrevious,
  position,
}: AnchorBlockModalProps) => {
  const opened = block !== null;
  const bodyRef = useRef<HTMLElement | null>(null);
  /**
   * 字号弹层：记着它是「为哪一块」打开的，换块之后自然算作收起——
   * 用记录归属的派生状态，而不是在 effect 里 setState（那会多渲染一轮）。
   */
  const [fontPanel, setFontPanel] = useState({ anchor: '', opened: false });
  /** 正文节点同时存一份 state：节点挂载 / 卸载时让依赖它的 effect 重建 */
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  /** 全屏与字号都是「怎么看」的偏好，和主预览共用存储，换一块也不重置 */
  const { fullscreen, toggle } = useModalFullscreen();
  const proseFont = useProseFontScale();
  const proseStyle = { '--prose-extra': `${proseFont.offset}px` } as CSSProperties;

  const headings = block ? block.headings : NO_HEADINGS;
  /**
   * header 标题：区块标题 + 它所处的那一节（上一级标题），
   * 如「本轮习题 · 2026-11-15 12:05 · 复习」——同一篇里好几轮复习时靠它分清这一块是哪一轮的。
   */
  const title = block
    ? [block.title || block.anchor, block.parentTitle].filter(Boolean).join(' · ')
    : '';

  /** 面板说的永远是「当前这一块」的字号：换块后按归属算作收起 */
  const fontOpened =
    block !== null && fontPanel.anchor === block.anchor && fontPanel.opened;

  /** 开合字号弹层，同时记下它属于哪一块 */
  const setFontOpened = (next: boolean) => {
    setFontPanel({ anchor: block ? block.anchor : '', opened: next });
  };

  /** 正文只随区块重建：`react-markdown` 每次渲染都要重新解析整段 */
  const bodyContent = useMemo(
    () =>
      block ? (
        <Markdown rehypePlugins={REHYPE_PLUGINS} remarkPlugins={REMARK_PLUGINS}>
          {block.markdown}
        </Markdown>
      ) : null,
    [block],
  );

  /** 滚动正文时跟踪当前小节，供这一块自己的目录高亮 */
  const activeIndex = useActiveHeadingIndex({
    container: bodyElement,
    enabled: opened,
    headings,
  });

  /** 换块时正文回到顶部：上一块读到一半的位置不该留给下一块 */
  useDocumentScrollReset(bodyRef, block ? block.anchor : '', opened);

  /**
   * 正文节点的 callback ref：ref 对象给需要即时读取的地方用，
   * state 负责在节点挂载 / 卸载时触发依赖它的 effect 重建。
   * 必须是稳定引用——每次渲染换一个新函数会让 React 反复卸载 / 重挂这个 ref。
   */
  const attachBody = useCallback((node: HTMLElement | null) => {
    bodyRef.current = node;
    setBodyElement(node);
  }, []);

  /**
   * 区块里的同文档链接：只在这一块内部跳，不再往下开第三层弹窗。
   * 拦下来是必需的——否则点一下会把地址栏改成 `#…`。
   */
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const anchor = getClickedAnchor(event.target);

    if (!anchor) {
      return;
    }

    event.preventDefault();
    scrollToAnchor(bodyRef.current, anchor);
  };

  return (
    <Modal
      centered
      classNames={{
        body: previewStyles.body,
        content: cx(
          previewStyles.content,
          styles.blockContent,
          fullscreen && styles.blockFullscreen,
        ),
        header: previewStyles.header,
        title: previewStyles.title,
      }}
      closeButtonProps={{ 'aria-label': '关闭区块预览' }}
      fullScreen={fullscreen}
      onClose={onClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
      padding={0}
      radius="md"
      size="min(880px, 88vw)"
      title={
        <AnchorBlockHeader
          fontControl={
            <ProseFontControl
              onChange={setFontOpened}
              opened={fontOpened}
              scale={proseFont}
            />
          }
          fullscreen={fullscreen}
          onNext={onNext}
          onPrevious={onPrevious}
          onToggleFullscreen={toggle}
          position={position}
          title={title}
        />
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
    >
      {/* 工作区与主预览同一套：左侧目录占一列、右侧正文各自滚动 */}
      <div className={previewStyles.workspace}>
        <OutlineNav
          activeIndex={activeIndex}
          disabled={!opened}
          fullscreen={fullscreen}
          headings={headings}
          onSelect={(index) => scrollToHeading(bodyRef.current, index)}
        />
        <div className={previewStyles.pane}>
          {block ? (
            <article
              className={cx(
                previewStyles.prose,
                fullscreen && previewStyles.proseFullscreen,
              )}
              onClick={handleClick}
              ref={attachBody}
              style={proseStyle}
            >
              {bodyContent}
            </article>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default AnchorBlockModal;
