/**
 * 弹窗外壳：Mantine `Modal` 加项目统一外观。框体、header 与正文区只在这里定义一次；
 * 业务弹窗通过 props 给标题、操作与正文。全屏状态由调用方持有，这里只读 `active`。
 */

import { FocusTrap, Modal } from '@mantine/core';
import type { ModalCloseButtonProps } from '@mantine/core';
import {
  IconMaximize,
  IconMinimize,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { DOCK_WINDOW_Z_INDEX } from '@/dock/constants';
import { cx } from '@/utils/cx';

import DockAction from './DockAction';
import HeaderNav from './HeaderNav';
import MinimizeAction from './MinimizeAction';
import { useAutoHideHeader } from './hooks/useAutoHideHeader';
import { useDockNav } from './hooks/useDockNav';
import { useDockMinimize } from './hooks/useDockMinimize';
import { useModalDockState } from './hooks/useModalDockState';
import { useOverlayFocusGuard } from './hooks/useOverlayFocusGuard';
import { useModalShortcuts } from './hooks/useModalShortcuts';
import type { FreeModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：翻页、全屏、关闭同一档 */
const ICON_SIZE = 15;
const STEP_ICON_SIZE = 16, ICON_STROKE = 1.9;

/** 翻页的默认快捷键提示，只进 tooltip */
const NAV_SHORTCUT_HINT = '[ / ← · ] / →';

/** header 选择器：给「指针停在 header 上就别自动收起」用，业务侧也拿它收播放器控制栏 */
export const MODAL_HEADER_SELECTOR = `.${styles.header}`;

/**
 * 框体那一层的选择器：给「只有指针落在内容框里才算活动」用。
 * 弹窗外面那层遮罩不属于内容——预览弹窗非全屏时四周都是遮罩，在遮罩上挪指针不该唤出 header。
 */
export const MODAL_CONTENT_SELECTOR = `.${styles.content}`;

/** 弹窗外壳：业务侧只管标题、右侧操作与正文，header 排布与固定按钮都在这里 */
const FreeModal = ({
  beforeMinimize,
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
  const { canMinimize, canRemove, minimize: minimizeToDock, remove: removeFromDock } =
    useDockMinimize({ beforeMinimize, dock, onClose, opened });
  /** 只有已收录的窗关闭才回坞；普通页面弹窗照常关闭 */
  const { backgroundDockWindow, docked } = useModalDockState({
    canRemove,
    dock,
    fullscreenActive: fullscreen?.reportActive ?? (fullscreen?.active === true),
    opened,
  });
  const closeAction = docked ? minimizeToDock : onClose;
  /**
   * 已收录的窗：右上角那颗外观像关闭，动作却是收坞，容易误解。
   * 这里把它换成最小化图标；「关闭并从程序坞移除」则交给 `DockAction` 的 X。
   * 未收录的窗仍保留组件库原生关闭按钮，语义与外观一致。
   */
  const minimizeClose = closeButton && docked;
  const systemClose = closeButton && !docked;
  const headerNav = useDockNav(dock, nav);
  const effectiveZIndex =
    zIndex ?? (dock?.origin === 'dock' ? DOCK_WINDOW_Z_INDEX : undefined);
  const dockSurfaceProps =
    dock === undefined
      ? {}
      : ({ 'data-dock-surface': dock.id } as Record<string, string>);

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
    disabled: shortcutsEnabled === false || backgroundDockWindow,
    enabled: opened,
    arrowNav: dock?.origin === 'dock' ? headerNav : undefined,
    extraKeys,
    nav,
    onCapture,
    onClose: closeAction,
    onDismiss: docked ? closeAction : undefined,
    onRequestDelete,
    onRequestEscape,
    onSeek,
    onToggleFullscreen,
    onToggleMute: media?.onToggleMute,
    onTogglePlay: media?.onTogglePlay,
  });

  const isOverlayFocusGuard = useOverlayFocusGuard();

  const handleOverlayClick = () => {
    if (isOverlayFocusGuard()) {
      return;
    }

    // 已收录的窗：遮罩只负责收回程序坞；没收录的普通弹窗仍按 closeOnClickOutside 关闭
    if (docked) {
      minimizeToDock();

      return;
    }

    if (closeOnClickOutside) {
      onClose();
    }
  };

  const navHint = headerNav?.shortcutHint ?? NAV_SHORTCUT_HINT;

  const tip = (label: string): string => `${label}（${navHint}）`;

  const hasCustomActions = Boolean(headerActions || headerTail || headerSecondary);
  const hasFixedActions = Boolean(
    (fullscreen && fullscreenToggleVisible) || canMinimize,
  );

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
      onClose={closeAction}
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
          {headerNav ? (
            <HeaderNav
              iconSize={STEP_ICON_SIZE}
              iconStroke={ICON_STROKE}
              nav={headerNav}
              tip={tip}
              tipDark={tipDark}
            />
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
          {headerSecondary}
          {headerTail}
          {/* 页面定制操作与弹窗固定操作分成两组，不让业务按钮和全屏 / 收录挤在一起 */}
          {hasCustomActions && hasFixedActions ? (
            <span aria-hidden="true" className={styles.divider} />
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
          <DockAction
            canMinimize={canMinimize}
            canRemove={canRemove}
            disabled={dock?.disabled === true}
            iconSize={ICON_SIZE}
            iconStroke={ICON_STROKE}
            onMinimize={minimizeToDock}
            onRemove={removeFromDock}
            tipDark={tipDark}
          />
          {/* 关闭前只画一条分界；没有关闭按钮或右侧没图标时不画，免得留孤线 */}
          {closeButton && (hasCustomActions || hasFixedActions) ? (
            <span aria-hidden="true" className={styles.divider} />
          ) : null}
          {minimizeClose ? (
            <MinimizeAction
              iconSize={ICON_SIZE}
              iconStroke={ICON_STROKE}
              onClick={closeAction}
              tipDark={tipDark}
            />
          ) : null}
        </div>
      }
      transitionProps={
        dock?.origin === 'dock'
          ? { duration: 0 }
          : { duration: 140, transition: 'fade' }
      }
      trapFocus={trapFocus && !backgroundDockWindow}
      withCloseButton={systemClose}
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
