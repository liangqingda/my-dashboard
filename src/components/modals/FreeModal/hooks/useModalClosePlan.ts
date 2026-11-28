/**
 * 这一窗「关掉」时到底做什么、动画落点在哪。
 *
 * - 坞窗（`origin: 'dock'`）：关闭就是收回它自己的图标，由程序坞那套动画负责；
 * - 页面弹窗：落点永远是**打开它的那一点**。坞里已有同一条时只刷新条目（`sourceEl` 传 null，
 *   不飞到图标——飞向图标属于 header 那颗「收起到程序坞」按钮），`onMinimize` 给了就按收起
 *   口径收场（页面状态留着），否则照常关页；
 * - X（`closeAndRemove`）：先从坞里删掉这条，删完不能再刷新条目（否则又给加回去）。
 */

import { useCallback } from 'react';

import type { DockDescriptor } from '@/dock/types';

type UseModalClosePlanParams = {
  dock?: DockDescriptor;
  /** 坞里是否已有当前这条（页面弹窗按内容 id、坞窗按它挂着的图标） */
  docked: boolean;
  /** 收回程序坞图标（带飞入动画） */
  minimize: () => void;
  /** 收起口径的收场动作：给了就留页面状态，不给按关页收场 */
  onMinimize?: () => void;
  /** 只刷新坞里那条、不飞到图标 */
  refreshEntry: () => void;
  /** 从坞里删掉当前这条 */
  remove: () => void;
  /** 收回打开点的动画；`after` 是这一轮收场动作 */
  requestClose: (after?: () => void) => void;
};

type UseModalClosePlanResult = {
  /** 所有「关闭」入口（X 以外）共用的动作 */
  close: () => void;
  /** X：连坞里那条一起删 */
  closeAndRemove: () => void;
};

export const useModalClosePlan = ({
  dock,
  docked,
  minimize,
  onMinimize,
  refreshEntry,
  remove,
  requestClose,
}: UseModalClosePlanParams): UseModalClosePlanResult => {
  const dockOrigin = dock?.origin;

  const close = useCallback(() => {
    if (dockOrigin === 'dock' && docked) {
      minimize();

      return;
    }

    if (!docked) {
      requestClose();

      return;
    }

    refreshEntry();
    requestClose(onMinimize);
  }, [dockOrigin, docked, minimize, onMinimize, refreshEntry, requestClose]);

  const closeAndRemove = useCallback(() => {
    remove();

    if (dockOrigin === 'page') {
      requestClose();
    }
  }, [dockOrigin, remove, requestClose]);

  return { close, closeAndRemove };
};
