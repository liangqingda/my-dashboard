/**
 * 程序坞窗口的宿主：挂载业务窗口渲染器，并驱动打开 / 收起 / 换窗的动画。
 *
 * 同一扇窗在同一个宿主里经历 `opening` 与 `closing`：收起时先改阶段、复用组件实例，
 * 动画结束才卸载。打开分两种：第一次从图标中心长大（`genie`），
 * 程序坞内换窗则整屏左右滑动（`slide`）。X / Esc 与空格一样收坞，只有「移除」走 `dismiss` 淡出。
 */

import { useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import type { ComponentType, MutableRefObject } from 'react';

import {
  DOCK_DISMISS_DURATION,
  DOCK_SHRINK_DURATION,
  DOCK_TRANSFORM_DURATION,
  DOCK_WINDOW_READY_TIMEOUT,
} from '../constants';
import {
  dismissWindow,
  findDockRoot,
  findDockSurface,
  growWindowFromDock,
  shrinkWindowToDock,
  slideOffset,
  slideWindowIn,
  waitForCondition,
  waitForFrames,
} from '../utils/dock-motion';
import type { DockSlideDirection } from '../utils/dock-motion';
import { fadeDockOverlay, findDockOverlay } from '../utils/dock-overlay';
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
  /** 第一次打开从图标中心长大（`genie`），换窗整屏滑动（`slide`），原地换内容不跑动画（`none`） */
  animate: 'genie' | 'slide' | 'none';
  /** 换窗方向：`next` 旧窗向左、新窗从右进，`prev` 反过来 */
  direction?: DockSlideDirection;
  /** 当前阶段；`closing` 时动画结束才卸载 */
  phase: 'opening' | 'closing';
  /** 重装次数：点回自己那颗图标时 +1，让窗口体按条目快照重新挂一次（窗本身不动） */
  revision?: number;
  /** 收起结束后是否把条目从程序坞删掉（关闭为 true，最小化为 false） */
  removeOnExit: boolean;
  /** 退出方式：缩回图标，或按弹窗默认淡出 */
  exit?: 'minimize' | 'dismiss';
};

type DockWindowHostProps = {
  /** 收起动画结束 */
  onExited: () => void;
  /** 这扇窗开始跑开窗几何动画：图标上的等待提示可以收了 */
  onPrepared: () => void;
  /** 用户关闭当前窗口：由 Provider 决定「先淡出再删条目」 */
  onRequestClose: () => void;
  /** 要渲染的那扇窗 */
  slot: DockWindowSlot;
  /** 窗正文是否就位：宿主开窗几何动画等它，取数慢的窗首帧为 false */
  readyRef: MutableRefObject<boolean>;
};

const DockWindowHost = ({
  onExited,
  onPrepared,
  onRequestClose,
  readyRef,
  slot,
}: DockWindowHostProps) => {
  const {
    Component,
    animate,
    contentEntry,
    direction = 'next',
    entry,
    exit = 'minimize',
    phase,
    revision = 0,
  } = slot;
  const onExitedRef = useRef(onExited);
  const onPreparedRef = useRef(onPrepared);
  const readyRefRef = useRef(readyRef);

  useEffect(() => {
    onExitedRef.current = onExited;
    onPreparedRef.current = onPrepared;
  }, [onExited, onPrepared]);

  /** 窗正文就位上报：直通控制器的 readyRef，宿主开窗动画据此解除等待 */
  const handleWindowReady = useCallback((ready: boolean) => {
    readyRefRef.current.current = ready;
  }, []);

  useLayoutEffect(() => {
    const controller = new AbortController();
    const isCancelled = () => controller.signal.aborted;
    const entryId = entry.id;

    /*
     * 展开前接管第一帧：genie 隐藏等动画，slide 直接摆到屏幕外，避免闪终态。
     * 框体可能还没渲染出来（内容框由弹窗组件晚一两帧挂），所以这里不能只试一次——
     * 先在本帧试，`run` 里找到框体后再补一次，否则骨架会先以终态露一屏，
     * 再被动画拽回图标起点。
     */
    const captureOpeningFrame = () => {
      if (phase !== 'opening' || animate === 'none') {
        return;
      }

      const content = findDockSurface(entryId);

      if (content !== null) {
        if (animate === 'slide') {
          content.style.transformOrigin = 'center';
          content.style.transform = `translate3d(${slideOffset(content, direction)}px, 0, 0)`;
        } else {
          content.style.opacity = '0';
        }
      }

      const overlay = findDockOverlay(findDockRoot(entryId));

      if (overlay !== null) {
        overlay.style.opacity = animate === 'slide' ? '1' : '0';
      }
    };

    captureOpeningFrame();

    const run = async () => {
      // 窗已经开着、只是把内容换回它自己那条：不动几何，直接结束
      if (phase === 'opening' && animate === 'none') {
        return;
      }

      const content = await waitForFrames(() => findDockSurface(entryId));

      if (content === null) {
        // 框体始终没挂出来：图标上的等待提示不能一直转
        onPreparedRef.current();

        if (phase === 'closing') {
          onExitedRef.current();
        }

        return;
      }

      if (isCancelled()) {
        return;
      }

      /* 框体这一帧才出现：补一次接管，骨架不能先以终态画出来 */
      captureOpeningFrame();

      /*
       * 空场长大（genie）的窗先挂骨架、正文异步替换：几何动画量到的框体必须是正文就位后的
       * 终态，否则骨架→正文的整块替换会在动画途中二次重排 / 重挂。等窗自己上报就位；
       * 超时兜底，上报链路异常时也不把窗卡在隐藏态。换窗滑动（slide）的框体与上一扇同构，不等。
       */
      if (phase === 'opening' && animate === 'genie') {
        await waitForCondition(
          () => readyRefRef.current.current,
          DOCK_WINDOW_READY_TIMEOUT,
        );

        if (isCancelled()) {
          return;
        }
      }

      const root = findDockRoot(entryId);

      if (phase === 'opening') {
        // 窗要现身了：图标上的等待提示交给这趟动画
        onPreparedRef.current();

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
  }, [animate, contentEntry.id, direction, entry.id, exit, phase, revision]);

  // `revision` 变一次就重挂一次窗口体：点回自己那颗图标时把内容装回条目快照
  return (
    <Component
      entry={entry}
      key={`${entry.id}#${revision}`}
      onRequestClose={onRequestClose}
      onWindowReady={handleWindowReady}
    />
  );
};

export default DockWindowHost;
