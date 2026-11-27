/**
 * 程序坞窗口的宿主：挂载业务窗口渲染器，并驱动「从图标长出来 / 缩回图标」的动画。
 *
 * 一扇窗只在两种阶段存在：`opening`（刚点开，从程序坞长出来）与
 * `closing`（关闭 / 让位给下一扇，缩回程序坞）。动画作用在真正的窗口框体上，
 * 结束才卸载，避免「先消失再飞回去」的断帧。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ComponentType } from 'react';

import {
  findDockSurface,
  growWindowFromDock,
  shrinkWindowToDock,
  waitForFrames,
} from '../utils/dock-motion';
import type {
  DockEntry,
  DockPlacement,
  DockWindowProps,
} from '../types';

/** 已加载好的窗口渲染器 + 它对应的条目 */
export type DockWindowSlot = {
  Component: ComponentType<DockWindowProps>;
  entry: DockEntry;
};

type DockWindowHostProps = {
  /** 动画结束（缩回程序坞了） */
  onExited: () => void;
  /** 用户关闭当前窗口：由 Provider 决定「先缩回再删条目」 */
  onRequestClose: () => void;
  /** 当前阶段 */
  phase: 'opening' | 'closing';
  /** 程序坞停在哪条边，决定收放方向 */
  placement: DockPlacement;
  /** 要渲染的那扇窗 */
  slot: DockWindowSlot;
};

const DockWindowHost = ({
  onExited,
  onRequestClose,
  phase,
  placement,
  slot,
}: DockWindowHostProps) => {
  const onExitedRef = useRef(onExited);
  const onRequestCloseRef = useRef(onRequestClose);

  // 异步动画里读最新回调，但不在渲染阶段写 ref
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useLayoutEffect(() => {
    // 卸载后动画可能还在收尾：用 AbortSignal 判断，函数取值避免布尔被控制流窄化
    const controller = new AbortController();
    const isCancelled = () => controller.signal.aborted;

    // 展开前先把框体藏住：等动画第一帧接管 opacity，否则会先闪一帧终态
    if (phase === 'opening') {
      const immediate = findDockSurface(slot.entry.id);

      if (immediate !== null) {
        immediate.style.opacity = '0';
      }
    }

    const run = async () => {
      const content = await waitForFrames(() => findDockSurface(slot.entry.id));

      if (content === null || isCancelled()) {
        if (phase === 'closing') {
          onExitedRef.current();
        }

        return;
      }

      if (phase === 'opening') {
        await growWindowFromDock(content, slot.entry.id, placement);
        return;
      }

      await shrinkWindowToDock(content, slot.entry.id, placement);

      if (!isCancelled()) {
        onExitedRef.current();
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [phase, placement, slot.entry.id]);

  const { Component, entry } = slot;

  return (
    <Component
      entry={entry}
      onRequestClose={phase === 'closing' ? onExited : onRequestClose}
    />
  );
};

export default DockWindowHost;
