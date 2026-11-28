/** 从程序坞图标恢复一扇窗口：同 id 的页面弹窗先收起，已有窗口按顺序整屏切换。 */

import type { MutableRefObject } from 'react';

import type { UseDockModalStackResult } from '../hooks/useDockModalStack';
import type { DockWindowSlot } from '../dock-window';
import { loadDockWindow } from '../windows/registry';
import type { DockEntry } from '../types';

type RestoreDockWindowParams = {
  activateEntry: (
    entry: DockEntry,
    Component: DockWindowSlot['Component'],
  ) => void;
  beginClosing: (
    slot: DockWindowSlot,
    removeOnExit: boolean,
    exit: 'minimize' | 'dismiss',
  ) => void;
  entriesRef: MutableRefObject<DockEntry[]>;
  id: string;
  modalStack: UseDockModalStackResult['modalStack'];
  /** 本次恢复的序号：后续恢复会把旧序号顶掉 */
  seq: number;
  currentSeq: () => number;
  windowRef: MutableRefObject<DockWindowSlot | null>;
};

export const restoreDockWindow = ({
  activateEntry,
  beginClosing,
  entriesRef,
  id,
  modalStack,
  currentSeq,
  seq,
  windowRef,
}: RestoreDockWindowParams): void => {
  const entry = entriesRef.current.find((candidate) => candidate.id === id);

  if (entry === undefined) {
    return;
  }

  const { current } = windowRef;

  if (current === null) {
    /*
     * 页面里的同一扇弹窗已经开着（条目在程序坞里所以图标是激活的）：
     * 再点图标就是把它收回程序坞，不能又装一扇程序坞窗口出来。
     */
    const registration = modalStack.current.find(
      (candidate) => candidate.id === id,
    );

    if (registration !== undefined) {
      registration.minimize();

      return;
    }
  }

  if (current !== null) {
    if (current.phase === 'closing') {
      return;
    }

    // 点的是「这一窗当前显示的内容」：收回程序坞，不再新装一扇窗
    if (current.entry.id === id || current.contentEntry.id === id) {
      // 走登记的收起动作：翻篇后的最新快照只有这一窗的描述符知道
      const registration = modalStack.current.find(
        (candidate) => candidate.id === id,
      );

      if (registration !== undefined) {
        registration.minimize();
      } else {
        beginClosing(current, false, 'minimize');
      }

      return;
    }
  }

  /*
   * 程序坞窗口永远以普通尺寸恢复：旧页面弹窗若还占着浏览器整屏，先退出，
   * 避免新窗挂载时误判成全屏、两边同时请求 Fullscreen API。
   */
  if (document.fullscreenElement !== null) {
    void document.exitFullscreen().catch(() => undefined);
  }

  void loadDockWindow(entry.kind).then((Component) => {
    if (currentSeq() !== seq) {
      return;
    }

    activateEntry(entry, Component);
  });
};
