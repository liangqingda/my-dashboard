/**
 * 程序坞窗口的宿主：挂载业务窗口渲染器，并驱动打开 / 收起 / 换窗的动画。
 *
 * 同一扇窗在同一个宿主里经历 `opening` 与 `closing`：收起时先改阶段、复用组件实例，
 * 动画结束才卸载。打开分两种：第一次从图标中心长大（`genie`），
 * 程序坞内换窗则整屏左右滑动（`slide`）。X / Esc 与空格一样收坞，只有「移除」走 `dismiss` 淡出。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ComponentType } from 'react';

import {
  DOCK_DISMISS_DURATION,
  DOCK_SHRINK_DURATION,
  DOCK_TRANSFORM_DURATION,
} from '../constants';
import {
  dismissWindow,
  findDockSurface,
  growWindowFromDock,
  shrinkWindowToDock,
  slideOffset,
  slideWindowIn,
  waitForFrames,
} from '../utils/dock-motion';
import type { DockSlideDirection } from '../utils/dock-motion';
import { fadeDockOverlay, findDockOverlay, findDockRoot } from '../utils/dock-overlay';
import type { DockEntry, DockWindowProps } from '../types';

/** 已加载好的窗口渲染器 + 它的编排状态 */
export type DockWindowSlot = {
  Component: ComponentType<DockWindowProps>;
  /** 窗自身的身份：打开 / 换窗时定下，翻篇后不变（React key、根节点 id、开合动画都按它） */
  entry: DockEntry;
  /** 当前显示内容对应的条目：翻篇后更新，收起时缩回它的图标 */
  contentEntry: DockEntry;
  /** 移除时要从程序坞删掉的条目 id（关闭窗口顺手删当前这条） */
  removeId?: string;
  /** 第一次打开从图标中心长大（`genie`），换窗整屏滑动（`slide`） */
  animate: 'genie' | 'slide';
  /** 换窗方向：`next` 旧窗向左、新窗从右进，`prev` 反过来 */
  direction?: DockSlideDirection;
  /** 当前阶段；`closing` 时动画结束才卸载 */
  phase: 'opening' | 'closing';
  /** 收起结束后是否把条目从程序坞删掉（关闭为 true，最小化为 false） */
  removeOnExit: boolean;
  /** 退出方式：缩回图标，或按弹窗默认淡出 */
  exit?: 'minimize' | 'dismiss';
};

type DockWindowHostProps = {
  /** 收起动画结束 */
  onExited: () => void;
  /** 用户关闭当前窗口：由 Provider 决定「先淡出再删条目」 */
  onRequestClose: () => void;
  /** 要渲染的那扇窗 */
  slot: DockWindowSlot;
};

const DockWindowHost = ({ onExited, onRequestClose, slot }: DockWindowHostProps) => {
  const {
    Component,
    animate,
    contentEntry,
    direction = 'next',
    entry,
    exit = 'minimize',
    phase,
  } = slot;
  const onExitedRef = useRef(onExited);

  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  useLayoutEffect(() => {
    const controller = new AbortController();
    const isCancelled = () => controller.signal.aborted;
    const entryId = entry.id;

    // 展开前先接管第一帧：genie 隐藏等动画，slide 直接摆到屏幕外，避免闪终态
    if (phase === 'opening') {
      const immediate = findDockSurface(entryId);
      const root = findDockRoot(entryId);
      const overlay = findDockOverlay(root);

      if (immediate !== null) {
        if (animate === 'slide') {
          immediate.style.transformOrigin = 'center';
          immediate.style.transform = `translate3d(${slideOffset(immediate, direction)}px, 0, 0)`;
        } else {
          immediate.style.opacity = '0';
        }
      }

      if (overlay !== null) {
        overlay.style.opacity = animate === 'slide' ? '1' : '0';
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

      const root = findDockRoot(entryId);

      if (phase === 'opening') {
        if (animate === 'slide') {
          await slideWindowIn(content, direction);
        } else {
          fadeDockOverlay(root, 'in', DOCK_TRANSFORM_DURATION);
          await growWindowFromDock(content, entryId);
        }

        return;
      }

      // 上一条动画可能还在跑：取消，别让两条动画抢同一个 transform
      content.getAnimations().forEach((animation) => animation.cancel());
      content.style.pointerEvents = 'none';

      if (exit === 'dismiss') {
        fadeDockOverlay(root, 'out', DOCK_DISMISS_DURATION);
        await dismissWindow(content);
      } else {
        fadeDockOverlay(root, 'out', DOCK_SHRINK_DURATION);
        await shrinkWindowToDock(content, contentEntry.id);
      }

      if (!isCancelled()) {
        onExitedRef.current();
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [animate, contentEntry.id, direction, entry.id, exit, phase]);

  return (
    <Component entry={entry} key={entry.id} onRequestClose={onRequestClose} />
  );
};

export default DockWindowHost;
