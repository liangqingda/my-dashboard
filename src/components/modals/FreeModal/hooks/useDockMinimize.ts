/**
 * 弹窗的「收起到程序坞」动作与 `⌘M` 登记。
 *
 * 这个动作必须对页面弹窗与程序坞自己恢复出来的窗口是同一套：
 * - 页面弹窗收起后要关掉页面状态（origin = page），否则再打开时宿主状态会打架；
 * - 程序坞窗口收起只是回到图标（origin = dock），页面状态本来就没有，不能再关。
 * 差异只在 `origin` 一处，其余（量框体、交给 Provider 编排动画）两条路径共用。
 */

import { useCallback, useEffect, useRef } from 'react';

import { useDockOptional } from '@/dock/hooks/useDock';
import type { DockDescriptor } from '@/dock/types';
import { findDockSurface } from '@/dock/utils/dock-motion';

type UseDockMinimizeParams = {
  /** 本窗的程序坞描述；不传则这颗按钮不渲染 */
  dock?: DockDescriptor;
  /** 页面弹窗收起后要执行的关闭动作 */
  onClose: () => void;
  /** 收起动画开始前先做（如退出整屏 / 网页全屏），完成后才量落点 */
  beforeMinimize?: () => Promise<void> | void;
  /** 页面弹窗收起时改走它（保留页面状态）；不传则走 onClose */
  onMinimize?: () => void;
  /** 弹窗是否开着 */
  opened: boolean;
};

/** 返回最小化动作；`canMinimize` 决定 header 上画不画那颗按钮 */
export const useDockMinimize = ({
  beforeMinimize,
  dock,
  onClose,
  onMinimize,
  opened,
}: UseDockMinimizeParams) => {
  const dockContext = useDockOptional();
  const dockContextRef = useRef(dockContext);
  const dockRef = useRef(dock);
  const onCloseRef = useRef(onClose);
  const onMinimizeRef = useRef(onMinimize);
  const beforeMinimizeRef = useRef(beforeMinimize);
  const dockId = dock?.id;
  const dockDisabled = dock?.disabled;

  // 事件里读最新值、又不在渲染阶段写 ref：提交后再同步
  useEffect(() => {
    dockContextRef.current = dockContext;
  }, [dockContext]);

  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onMinimizeRef.current = onMinimize;
  }, [onMinimize]);

  useEffect(() => {
    beforeMinimizeRef.current = beforeMinimize;
  }, [beforeMinimize]);

  const minimize = useCallback(() => {
    const descriptor = dockRef.current;
    const context = dockContextRef.current;

    if (
      descriptor === undefined ||
      descriptor.disabled === true ||
      context === null
    ) {
      return;
    }

    const proceed = () => {
      // 程序坞窗口的根节点按 surfaceId 找（翻篇后它与当前内容的条目 id 已经不同）
      const accepted = context.minimize(
        descriptor,
        findDockSurface(descriptor.surfaceId ?? descriptor.id),
      );

      /*
       * 满员拒收时窗必须留在原地：先关窗再提示「没收进去」，
       * 用户看到的就是一次性丢了一扇窗，而不是「坞满了」。
       */
      if (!accepted) {
        return;
      }

      if (descriptor.origin !== 'dock') {
        (onMinimizeRef.current ?? onCloseRef.current)();
      }
    };

    if (beforeMinimizeRef.current === undefined) {
      proceed();

      return;
    }

    // 全屏退出是异步的；先退出再量程序坞落点，避免按全屏时的几何位置飞
    void Promise.resolve()
      .then(() => beforeMinimizeRef.current?.())
      .catch(() => undefined)
      .then(proceed);
  }, []);

  useEffect(() => {
    const context = dockContextRef.current;

    if (
      !opened ||
      dockId === undefined ||
      dockDisabled === true ||
      context === null
    ) {
      return undefined;
    }

    return context.registerModal({ id: dockId, minimize });
  }, [dockDisabled, dockId, minimize, opened]);

  /*
   * 已收录：页面弹窗看内容那条，程序坞窗口看它挂着的图标那条（`windowOwnerId`，
   * 窗内翻到别的内容也仍算收录），否则 header 会退回「关闭」口径，和图标状态对不上。
   */
  const canRemove =
    dock !== undefined &&
    dockContext !== null &&
    dockContext.entries.some(
      (entry) =>
        entry.id ===
        (dock.origin === 'dock'
          ? dockContext.windowOwnerId ?? dock.surfaceId ?? dock.id
          : dock.id),
    );

  /** X 移除的是这一窗挂着的图标（程序坞窗口），页面弹窗移除当前内容那条 */
  const remove = useCallback(() => {
    const descriptor = dockRef.current;
    const context = dockContextRef.current;

    if (descriptor === undefined || context === null) {
      return;
    }

    context.remove(
      descriptor.origin === 'dock'
        ? context.windowOwnerId ?? descriptor.surfaceId ?? descriptor.id
        : descriptor.id,
    );
  }, []);

  return {
    canMinimize: dock !== undefined && dockContext !== null,
    canRemove,
    minimize,
    remove,
  };
};
