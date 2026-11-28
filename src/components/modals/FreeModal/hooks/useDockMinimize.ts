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
  /** 弹窗是否开着 */
  opened: boolean;
};

/** 返回最小化动作；`canMinimize` 决定 header 上画不画那颗按钮 */
export const useDockMinimize = ({
  dock,
  onClose,
  opened,
}: UseDockMinimizeParams) => {
  const dockContext = useDockOptional();
  const dockRef = useRef(dock);
  const onCloseRef = useRef(onClose);
  const dockId = dock?.id;
  const dockDisabled = dock?.disabled;

  // 事件里读最新值、又不在渲染阶段写 ref：提交后再同步
  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const minimize = useCallback(() => {
    const descriptor = dockRef.current;

    if (
      descriptor === undefined ||
      descriptor.disabled === true ||
      dockContext === null
    ) {
      return;
    }

    dockContext.minimize(descriptor, findDockSurface(descriptor.id));

    if (descriptor.origin !== 'dock') {
      onCloseRef.current();
    }
  }, [dockContext]);

  useEffect(() => {
    if (
      !opened ||
      dockId === undefined ||
      dockDisabled === true ||
      dockContext === null
    ) {
      return undefined;
    }

    return dockContext.registerModal({ id: dockId, minimize });
  }, [dockContext, dockDisabled, dockId, minimize, opened]);

  /** 程序坞里已经有同 id 条目：header 那颗按钮改成「移除」，不再重复收录 */
  const canRemove =
    dock !== undefined &&
    dockContext !== null &&
    dockContext.entries.some((entry) => entry.id === dock.id);

  const remove = useCallback(() => {
    const descriptor = dockRef.current;

    if (descriptor === undefined || dockContext === null) {
      return;
    }

    dockContext.remove(descriptor.id);
  }, [dockContext]);

  return {
    canMinimize: dock !== undefined && dockContext !== null,
    canRemove,
    minimize,
    remove,
  };
};
