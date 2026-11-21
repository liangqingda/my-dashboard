/**
 * 弹窗外壳的基础组件（前端 UI 基建）：Mantine `Modal` 加项目统一外观。
 *
 * 框体尺寸与描边、紧凑 header（翻页 + 计数 + 标题 + 操作组 + 全屏 + 关闭）、正文区、
 * 全屏铺满这些只在这里定义一次；业务弹窗（`MarkdownPreviewModal`、记录的详情弹窗）
 * 通过 props 给标题、操作与正文，不再各自拼一遍 `Modal` 与 header 行。
 *
 * 全屏状态由调用方持有（正文排版要跟着变），状态本身用 `hooks/useModalFullscreen` 记住。
 */

import { ActionIcon, Modal, Tooltip } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
} from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import { useModalShortcuts } from './hooks/useModalShortcuts';
import type { FreeModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：翻页、全屏、关闭同一档 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16;
const ICON_STROKE = 1.9;

/** 翻页的默认快捷键提示，只进 tooltip */
const NAV_SHORTCUT_HINT = '[ / ← · ] / →';

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
  closeOnEscape = true,
  closeOnSpace,
  contentClassName,
  contentStyle,
  fullscreen,
  headerActions,
  headerSecondary,
  headerTail,
  height = 'reading',
  nav,
  onClose,
  opened,
  shortcutsEnabled = true,
  size = 'min(980px, 92vw)',
  title,
  trapFocus = true,
}: FreeModalProps) => {
  /**
   * 空格关窗与翻页 / 全屏快捷键：业务弹窗不用各自实现。
   * 空格默认与 Esc 同口径；翻页与全屏由 `shortcutsEnabled` 整组把关。
   */
  useModalShortcuts({
    closeOnSpace: closeOnSpace ?? closeOnEscape,
    disabled: shortcutsEnabled === false,
    enabled: opened,
    nav,
    onClose,
    onToggleFullscreen: fullscreen?.onToggle,
  });

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
        header: styles.header,
        title: styles.title,
      }}
      closeButtonProps={{ 'aria-label': closeLabel }}
      closeOnEscape={closeOnEscape}
      fullScreen={fullscreen?.active ?? false}
      onClose={onClose}
      opened={opened}
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
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
              <Tooltip label={tip(nav.previousLabel ?? '上一个')} withArrow>
                <ActionIcon
                  aria-label={nav.previousLabel ?? '上一个'}
                  className={styles.stepButton}
                  disabled={nav.disabled === true || nav.onPrevious === null}
                  onClick={nav.onPrevious ?? undefined}
                  size="sm"
                  variant="subtle"
                >
                  <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={tip(nav.nextLabel ?? '下一个')} withArrow>
                <ActionIcon
                  aria-label={nav.nextLabel ?? '下一个'}
                  className={styles.stepButton}
                  disabled={nav.disabled === true || nav.onNext === null}
                  onClick={nav.onNext ?? undefined}
                  size="sm"
                  variant="subtle"
                >
                  <IconChevronRight size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
                </ActionIcon>
              </Tooltip>
              <span className={styles.position}>
                {nav.index} / {nav.total}
              </span>
            </>
          ) : null}
          <span className={styles.fileName}>{title}</span>
          <span className={styles.titleGap} />
          {headerActions ? (
            <div className={styles.actions}>{headerActions}</div>
          ) : null}
          {fullscreen ? (
            <Tooltip
              label={fullscreen.active ? '退出全屏（F）' : '全屏（F）'}
              withArrow
            >
              <ActionIcon
                aria-label={fullscreen.active ? '退出全屏' : '全屏'}
                className={styles.iconButton}
                onClick={fullscreen.onToggle}
                size="sm"
                variant="subtle"
              >
                {fullscreen.active ? (
                  <IconMinimize size={ICON_SIZE} stroke={ICON_STROKE} />
                ) : (
                  <IconMaximize size={ICON_SIZE} stroke={ICON_STROKE} />
                )}
              </ActionIcon>
            </Tooltip>
          ) : null}
          {headerTail}
          {headerSecondary}
          {/*
            竖线只画在关闭按钮之前：它是「操作区 / 关闭」的分界，不和组与组的分隔混在一起。
            没有关闭按钮（编辑态关不掉）、或右侧一个图标都没渲染时都不画，免得留一条孤线。
          */}
          {closeButton && (headerActions || headerTail || fullscreen || headerSecondary) ? (
            <span aria-hidden="true" className={styles.divider} />
          ) : null}
        </div>
      }
      transitionProps={{ duration: 140, transition: 'fade' }}
      trapFocus={trapFocus}
      withCloseButton={closeButton}
    >
      {children}
    </Modal>
  );
};

export default FreeModal;
