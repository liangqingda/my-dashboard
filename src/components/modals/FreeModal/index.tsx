/**
 * 弹窗外壳的基础组件（前端 UI 基建）：Mantine `Modal` 加项目统一外观。
 *
 * 框体尺寸与描边、紧凑 header（翻页 + 计数 + 标题 + 操作组 + 全屏 + 关闭）、正文区、
 * 全屏铺满这些只在这里定义一次；业务弹窗（`MarkdownPreviewModal`、记录的详情弹窗）
 * 通过 props 给标题、操作与正文，不再各自拼一遍 `Modal` 与 header 行。
 *
 * 全屏状态由调用方持有（正文排版要跟着变），状态本身用 `hooks/useModalFullscreen` 记住。
 */

import { FocusTrap, Modal } from '@mantine/core';
import type { ModalCloseButtonProps } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
  IconWindowMinimize,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { DOCK_WINDOW_Z_INDEX } from '@/dock/constants';
import { cx } from '@/utils/cx';

import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useDockMinimize } from './hooks/useDockMinimize';
import { useOverlayFocusGuard } from './hooks/useOverlayFocusGuard';
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
 * header 那一行的选择器：给「指针停在 header 上就别自动收起」用（class 是哈希后的，只能由本组件算）。
 * 业务侧反向用得上——指针跑到 header 上时，把播放器控制栏这类同层 chrome 当场收掉。
 */
export const MODAL_HEADER_SELECTOR = `.${styles.header}`;

/**
 * 框体那一层的选择器：给「只有指针落在内容框里才算活动」用。
 * 弹窗外面那层遮罩不属于内容——预览弹窗非全屏时四周都是遮罩，在遮罩上挪指针不该唤出 header。
 */
export const MODAL_CONTENT_SELECTOR = `.${styles.content}`;

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
  dock,
  extraKeys,
  fullscreen,
  headerActions,
  headerClassName,
  headerOverlay,
  headerSecondary,
  headerTail,
  height = 'reading',
  innerClassName,
  media,
  nav,
  onClose,
  onRequestDelete,
  onRequestEscape,
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

  /** 收起到程序坞：按钮位置固定在关闭按钮左边，动作与 `⌘M` 登记共用一份 */
  const { canMinimize, minimize: minimizeToDock } = useDockMinimize({
    dock,
    onClose,
    opened,
  });
  const canDismissToDock = canMinimize && dock?.disabled !== true;
  /** 程序坞恢复出来的窗口默认抬到「压过所有页面弹窗」那一档 */
  const effectiveZIndex =
    zIndex ?? (dock?.origin === 'dock' ? DOCK_WINDOW_Z_INDEX : undefined);
  /** 给动画工具找框体用：程序坞窗口靠这个属性从根节点里量内容框 */
  const dockSurfaceProps =
    dock === undefined
      ? {}
      : ({ 'data-dock-surface': dock.id } as Record<string, string>);

  /** Esc 被业务接管（退出窗内模式）时不再交给 Mantine 关窗，键的处理挪到快捷键那一套里 */
  const escapeOverridden = Boolean(onRequestEscape);

  /**
   * header 浮层：只有媒体预览这类「打开先看画面」的弹窗会传 `headerOverlay`。
   * 显隐由外壳跟指针收放，弹层 / 二次确认开着时 `suspended` 让它恒为可见。
   */
  const headerIsOverlay = headerOverlay !== undefined;
  const autoHideVisible = useAutoHideHeader({
    enabled: headerOverlay !== undefined && headerOverlay.suspended !== true,
    holdSelector: MODAL_HEADER_SELECTOR,
    ignoreSelector: headerOverlay?.ignoreSelector,
    surfaceSelector: headerIsOverlay ? MODAL_CONTENT_SELECTOR : undefined,
  });
  /** 收起态只对浮层 header 有意义：普通流 header 不参与显隐 */
  const headerHidden = headerIsOverlay && !autoHideVisible;

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
    onDismiss: dock === undefined ? undefined : minimizeToDock,
    onRequestDelete,
    onRequestEscape,
    onSeek,
    onToggleFullscreen,
    onToggleMute: media?.onToggleMute,
    onTogglePlay: media?.onTogglePlay,
  });

  /** 刚回焦的那一下遮罩点击只当拿焦点，不关窗 / 不收起 */
  const isOverlayFocusGuard = useOverlayFocusGuard();

  /** 遮罩点击：能收起就先收进程序坞（条目保留），普通弹窗才关窗；回焦第一下不算 */
  const handleOverlayClick = () => {
    if (isOverlayFocusGuard()) {
      return;
    }

    // 能收起的弹窗：遮罩只负责收回程序坞，绝不在这里关掉条目
    if (dock !== undefined) {
      if (canDismissToDock) {
        minimizeToDock();
      }

      return;
    }

    if (closeOnClickOutside) {
      onClose();
    }
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
          headerIsOverlay && styles.headerOverlay,
          headerHidden && styles.headerHidden,
          tipDark && styles.headerOverlayOnMedia,
          headerClassName,
        ),
        title: styles.title,
      }}
      /*
       * 稳定钩子：浮层浅字档按属性选择器取色，不依赖组件库哈希类名；
       * 组件库 props 类型没声明自定义 data 属性，这里随按钮原生属性一并透传。
       */
      closeButtonProps={
        {
          'aria-label': closeLabel,
          'data-modal-close': true,
        } as ModalCloseButtonProps
      }
      closeOnClickOutside={false}
      closeOnEscape={closeOnEscape && !escapeOverridden}
      {...dockSurfaceProps}
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
            最小化：紧挨关闭按钮、在竖线之前，位置与「刷新 / 复制」那类操作分开，
            不让它跟业务操作挤在一起。编辑中 / 上层确认开着时置灰但保留位置。
          */}
          {canMinimize ? (
            <FreeIconAction
              disabled={dock?.disabled === true}
              label="收起到程序坞"
              onClick={minimizeToDock}
              tipDark={tipDark}
              tooltipLabel="收起到程序坞（⌘M）"
            >
              <IconWindowMinimize size={ICON_SIZE} stroke={ICON_STROKE} />
            </FreeIconAction>
          ) : null}
          {/*
            竖线只画在关闭按钮之前：它是「操作区 / 关闭」的分界，不和组与组的分隔混在一起。
            没有关闭按钮（编辑态关不掉）、或右侧一个图标都没渲染时都不画，免得留一条孤线。
          */}
          {closeButton &&
          (headerActions ||
            headerTail ||
            (fullscreen && fullscreenToggleVisible) ||
            headerSecondary ||
            canMinimize) ? (
            <span aria-hidden="true" className={styles.divider} />
          ) : null}
        </div>
      }
      transitionProps={
        dock?.origin === 'dock'
          ? { duration: 0 }
          : { duration: 140, transition: 'fade' }
      }
      trapFocus={trapFocus}
      withCloseButton={closeButton}
      zIndex={effectiveZIndex}
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
