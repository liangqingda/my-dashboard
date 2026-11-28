/**
 * 弹窗与程序坞的关系状态：这一窗是否算「已收录」，以及全屏态要不要上报给程序坞条。
 *
 * 页面弹窗打开时，程序坞里可能已经有同 id 的条目（之前收过一次），这时它算已收录；
 * 只有这种窗关闭才回坞，普通未收录弹窗照常关闭。
 */

import { useEffect, useId } from 'react';

import { useDockOptional } from '@/dock/hooks/useDock';
import type { DockDescriptor } from '@/dock/types';

type UseModalDockStateParams = {
  /** 本窗的程序坞描述 */
  dock?: DockDescriptor;
  /** 程序坞里是否已有同 id 条目 */
  canRemove: boolean;
  /** 当前是否处于全屏（CSS / 浏览器都算） */
  fullscreenActive: boolean;
  /** 弹窗是否打开 */
  opened: boolean;
};

/** 返回关闭口径与「是否退成背景层」；全屏态在打开期间同步给程序坞 */
export const useModalDockState = ({
  canRemove,
  dock,
  fullscreenActive,
  opened,
}: UseModalDockStateParams) => {
  const dockContext = useDockOptional();
  const fallbackModalId = useId();
  const modalFullscreenId = dock?.id ?? fallbackModalId;

  /*
   * 页面弹窗只有程序坞里确实存在当前这条时才算「已收录」。
   * 程序坞窗口（`origin: 'dock'`）永远算收录：它是某颗图标的窗，窗内翻篇只换内容，
   * 关闭动作与 header 都不该跟着内容退回普通关闭口径（`canRemove` 按 `surfaceId` 算）。
   */
  const docked =
    dock !== undefined && dock.disabled !== true && canRemove;

  /**
   * 页面弹窗背后的程序坞窗口还开着时，这一层退成只读背景：
   * 快捷键与焦点都让给顶层，避免两个 F 同时触发全屏请求。
   */
  const backgroundDockWindow =
    dock?.origin === 'page' &&
    dockContext !== null &&
    dockContext.activeEntryId !== null &&
    dockContext.activeEntryId !== dock.id;

  const reportFullscreen = dockContext?.reportFullscreen;
  const reportWindowEntry = dockContext?.reportWindowEntry;

  useEffect(() => {
    if (dock?.origin !== 'dock' || !opened || reportWindowEntry === undefined) {
      return undefined;
    }

    reportWindowEntry(dock.id);

    return () => reportWindowEntry(null);
  }, [dock?.id, dock?.origin, opened, reportWindowEntry]);

  useEffect(() => {
    if (reportFullscreen === undefined || !opened || !fullscreenActive) {
      return undefined;
    }

    reportFullscreen(modalFullscreenId, true);

    return () => reportFullscreen(modalFullscreenId, false);
  }, [fullscreenActive, modalFullscreenId, opened, reportFullscreen]);

  return { backgroundDockWindow, docked };
};
