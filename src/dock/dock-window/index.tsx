/**
 * 程序坞窗口的宿主：挂载业务窗口渲染器，并驱动「从图标长出来 / 缩回图标」的动画。
 *
 * 一扇窗在同一个宿主里经历 `opening` 与 `closing` 两个阶段：收起时只把状态改成
 * `closing`，React 复用同一个业务组件实例，框体当场缩回图标，不再「先卸载、再挂一份」。
 * `animate = swap` 是程序坞里换窗：不来回飞，只在原地淡入。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ComponentType } from 'react';

import {
  DOCK_MINIMIZE_DURATION,
  DOCK_RESTORE_DURATION,
  DOCK_SWAP_DURATION,
} from '../constants';
import {
  findDockSurface,
  growWindowFromDock,
  shrinkWindowToDock,
  swapWindowInPlace,
  waitForFrames,
} from '../utils/dock-motion';
import { fadeDockOverlay, findDockOverlay, findDockRoot } from '../utils/dock-overlay';
import type { DockEntry, DockPlacement, DockWindowProps } from '../types';

/** 已加载好的窗口渲染器 + 它的编排状态 */
export type DockWindowSlot = {
  Component: ComponentType<DockWindowProps>;
  entry: DockEntry;
  /** 打开时从图标长出来（`genie`）还是原地淡入（`swap`） */
  animate: 'genie' | 'swap';
  /** 当前阶段；`closing` 时动画结束才卸载 */
  phase: 'opening' | 'closing';
  /** 收起结束后是否把条目从程序坞删掉（关闭为 true，最小化为 false） */
  removeOnExit: boolean;
};

type DockWindowHostProps = {
  /** 收起动画结束 */
  onExited: () => void;
  /** 用户关闭当前窗口：由 Provider 决定「先缩回再删条目」 */
  onRequestClose: () => void;
  /** 程序坞停在哪条边，决定收放方向 */
  placement: DockPlacement;
  /** 要渲染的那扇窗 */
  slot: DockWindowSlot;
};

const DockWindowHost = ({
  onExited,
  onRequestClose,
  placement,
  slot,
}: DockWindowHostProps) => {
  const { Component, animate, entry, phase } = slot;
  const onExitedRef = useRef(onExited);
  const placementRef = useRef(placement);

  // 异步动画里读最新回调，但不在渲染阶段写 ref
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  // 停靠边只影响下一次收放的方向，不该在设置面板里改位置时把当前窗口重播一遍
  useLayoutEffect(() => {
    placementRef.current = placement;
  }, [placement]);

  useLayoutEffect(() => {
    // 卸载后动画可能还在收尾：用 AbortSignal 判断，函数取值避免布尔被控制流窄化
    const controller = new AbortController();
    const isCancelled = () => controller.signal.aborted;
    const entryId = entry.id;

    // 展开前先把框体藏住：等动画第一帧接管 opacity，否则会先闪一帧终态
    if (phase === 'opening') {
      const immediate = findDockSurface(entryId);
      const root = findDockRoot(entryId);

      if (immediate !== null) {
        immediate.style.opacity = '0';
      }

      const overlay = findDockOverlay(root);

      if (overlay !== null) {
        overlay.style.opacity = '0';
      }
    }

    const run = async () => {
      const content = await waitForFrames(() => findDockSurface(entryId));

      if (content === null) {
        if (phase === 'closing') {
          onExitedRef.current();
        }

        return;
      }

      if (isCancelled()) {
        return;
      }

      if (phase === 'opening') {
        const root = findDockRoot(entryId);

        fadeDockOverlay(
          root,
          'in',
          animate === 'swap' ? DOCK_SWAP_DURATION : DOCK_RESTORE_DURATION,
        );

        await (animate === 'swap'
          ? swapWindowInPlace(content)
          : growWindowFromDock(content, entryId, placementRef.current));
        return;
      }

      // 上一条展开动画可能还在跑：换向之前先取消，别让两条动画抢同一个 transform
      content.getAnimations().forEach((animation) => animation.cancel());
      content.style.pointerEvents = 'none';
      fadeDockOverlay(findDockRoot(entryId), 'out', DOCK_MINIMIZE_DURATION);

      await shrinkWindowToDock(content, entryId, placementRef.current);

      if (!isCancelled()) {
        onExitedRef.current();
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [phase, animate, entry.id]);

  return (
    <Component
      entry={entry}
      onRequestClose={phase === 'closing' ? onExited : onRequestClose}
    />
  );
};

export default DockWindowHost;
