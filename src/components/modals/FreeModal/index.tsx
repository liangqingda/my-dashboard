/**
 * 弹窗外壳的基础组件（前端 UI 基建）：Mantine `Modal` 加项目统一外观。
 *
 * 框体尺寸与描边、紧凑 header（翻页 + 计数 + 标题 + 操作组 + 全屏 + 关闭）、正文区、
 * 全屏铺满这些只在这里定义一次；业务弹窗（`MarkdownPreviewModal`、记录的详情弹窗）
 * 通过 props 给标题、操作与正文，不再各自拼一遍 `Modal` 与 header 行。
 *
 * 全屏状态由调用方持有（正文排版要跟着变），状态本身用 `hooks/useModalFullscreen` 记住。
 */

import { useEffect, useRef } from 'react';
import { FocusTrap, Modal } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import { useModalShortcuts } from './hooks/useModalShortcuts';
import type { FreeModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：翻页、全屏、关闭同一档 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16;
const ICON_STROKE = 1.9;

/** 窗口拿回焦点后这段时间内的遮罩点击只当「回焦」，不关窗 */
const OVERLAY_FOCUS_GUARD_MS = 400;

/** 翻页的默认快捷键提示，只进 tooltip */
const NAV_SHORTCUT_HINT = '[ / ← · ] / →';

/**
 * header 那一行的选择器：给「指针停在 header 上就别自动收起」这类调用方用。
 * 由本组件的样式模块算出——外壳的 class 是哈希后的，写死字符串必失效。
 */
export const MODAL_HEADER_SELECTOR = `.${styles.header}`;

/**
 * 基础弹窗外壳。业务侧只管「标题是什么、右侧放哪些操作、正文是什么」，
 * header 的排布、全屏与关闭按钮的位置固定在这里。
 */
const FreeModal = ({
  bodyClassName,
  centered = true,
  children,
  closeButton = true,
  closeLabel = '关闭',
  closeOnClickOutside = true,
  closeOnEscape = true,
  closeOnSpace,
  contentClassName,
  contentStyle,
  copy,
  extraKeys,
  fullscreen,
  headerActions,
  headerHidden = false,
  headerOverlay = false,
  headerSecondary,
  headerTail,
  height = 'reading',
  innerClassName,
  media,
  nav,
  onClose,
  onRequestDelete,
  onCapture,
  onSeek,
  opened,
  overlayTone = 'light',
  shortcutsEnabled = true,
  size = 'min(980px, 92vw)',
  title,
  tipDark = false,
  trapFocus = true,
  zIndex,
}: FreeModalProps) => {
  /**
   * 全屏切换入口：`showToggle: false` 时不画按钮（业务把全屏入口放在自己的控制栏里），
   * 但只要给了 `onToggle`，`F` 快捷键照常生效；尺寸由 `active` 单独决定，两件事分开。
   */
  const fullscreenToggleVisible = fullscreen?.showToggle !== false;
  const onToggleFullscreen = fullscreen?.onToggle;

  /**
   * 空格关窗与翻页 / 全屏 / 复制 / 删除快捷键：业务弹窗不用各自实现。
   * 空格默认与 Esc 同口径；其余键由 `shortcutsEnabled` 整组把关，复制与删除另按能力挂接。
   */
  useModalShortcuts({
    closeOnSpace: closeOnSpace ?? closeOnEscape,
    copy: copy?.text,
    copyMessage: copy?.message,
    disabled: shortcutsEnabled === false,
    enabled: opened,
    extraKeys,
    nav,
    onCapture,
    onClose,
    onRequestDelete,
    onSeek,
    onToggleFullscreen,
    onToggleMute: media?.onToggleMute,
    onTogglePlay: media?.onTogglePlay,
  });

  /** 窗口刚拿回焦点的时间点：从外部应用切回来的第一下点击只当回焦，不关窗 */
  const focusAtRef = useRef(0);

  useEffect(() => {
    const onFocus = () => {
      focusAtRef.current = performance.now();
    };

    window.addEventListener('focus', onFocus);

    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /** 遮罩点击：真正关窗的是这里（Mantine 那套关掉，换成带回焦保护的版本） */
  const handleOverlayClick = () => {
    if (!closeOnClickOutside) {
      return;
    }

    if (performance.now() - focusAtRef.current < OVERLAY_FOCUS_GUARD_MS) {
      return;
    }

    onClose();
  };

  /** 翻页 tooltip 的快捷键提示：业务侧没给就用这套统一的键位 */
  const navHint = nav?.shortcutHint ?? NAV_SHORTCUT_HINT;

  /** tooltip 文案：带快捷键时括在文案后面，aria-label 仍是纯动作名 */
  const tip = (label: string): string => `${label}（${navHint}）`;

  return (
    <Modal
      centered={centered}
      classNames={{
        body: cx(
          styles.body,
          height === 'auto' && styles.bodyAuto,
          bodyClassName,
        ),
        content: cx(
          styles.content,
          height === 'auto' && styles.contentAuto,
          fullscreen?.active && styles.contentFullscreen,
          contentClassName,
        ),
        inner: innerClassName,
        header: cx(
          styles.header,
          headerOverlay && styles.headerOverlay,
          headerHidden && styles.headerHidden,
        ),
        title: styles.title,
      }}
      closeButtonProps={{ 'aria-label': closeLabel }}
      closeOnClickOutside={false}
      closeOnEscape={closeOnEscape}
      fullScreen={fullscreen?.active ?? false}
      onClose={onClose}
      opened={opened}
      overlayProps={{
        className: cx(
          styles.overlay,
          overlayTone === 'dark' && styles.overlayMedia,
        ),
        onClick: handleOverlayClick,
      }}
      padding={0}
      radius="md"
      size={size}
      styles={{ content: contentStyle }}
      title={
        <div
          className={cx(
            styles.titleRow,
            closeButton && styles.titleRowBeforeClose,
          )}
        >
          {nav ? (
            <>
              <FreeIconAction
                disabled={nav.disabled === true || nav.onPrevious === null}
                label={nav.previousLabel ?? '上一个'}
                onClick={nav.onPrevious ?? undefined}
                tipDark={tipDark}
                tooltipLabel={tip(nav.previousLabel ?? '上一个')}
              >
                <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
              </FreeIconAction>
              <FreeIconAction
                disabled={nav.disabled === true || nav.onNext === null}
                label={nav.nextLabel ?? '下一个'}
                onClick={nav.onNext ?? undefined}
                tipDark={tipDark}
                tooltipLabel={tip(nav.nextLabel ?? '下一个')}
              >
                <IconChevronRight size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
              </FreeIconAction>
              <span className={styles.position}>
                {nav.index} / {nav.total}
              </span>
            </>
          ) : null}
          <FreeTruncatedText
            className={styles.fileName}
            inline
            position="bottom"
            text={title}
            tipDark={tipDark}
          />
          <span className={styles.titleGap} />
          {headerActions ? (
            <div className={styles.actions}>{headerActions}</div>
          ) : null}
          {fullscreen && fullscreenToggleVisible ? (
            <FreeIconAction
              label={fullscreen.active ? '退出全屏' : '全屏'}
              onClick={fullscreen.onToggle}
              tipDark={tipDark}
              tooltipLabel={fullscreen.active ? '退出全屏（F）' : '全屏（F）'}
            >
              {fullscreen.active ? (
                <IconMinimize size={ICON_SIZE} stroke={ICON_STROKE} />
              ) : (
                <IconMaximize size={ICON_SIZE} stroke={ICON_STROKE} />
              )}
            </FreeIconAction>
          ) : null}
          {headerTail}
          {headerSecondary}
          {/*
            竖线只画在关闭按钮之前：它是「操作区 / 关闭」的分界，不和组与组的分隔混在一起。
            没有关闭按钮（编辑态关不掉）、或右侧一个图标都没渲染时都不画，免得留一条孤线。
          */}
          {closeButton &&
          (headerActions ||
            headerTail ||
            (fullscreen && fullscreenToggleVisible) ||
            headerSecondary) ? (
            <span aria-hidden="true" className={styles.divider} />
          ) : null}
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
      trapFocus={trapFocus}
      withCloseButton={closeButton}
      zIndex={zIndex}
    >
      {/*
        初始焦点落在隐藏节点上（`data-autofocus` + `tabindex=-1`，全局样式不给它画焦点环）：
        Mantine 的 FocusTrap 默认会把焦点给内容里第一颗可 Tab 的按钮，也就是 header 的
        「上一条」——弹窗一开那颗按钮就被聚焦，之后按任何键它还会亮一圈主色焦点环，
        看着像「刚才点的是它」。Tab 的第一个落点仍是第一颗真实控件。
      */}
      <FocusTrap.InitialFocus />
      {children}
    </Modal>
  );
};

export default FreeModal;
