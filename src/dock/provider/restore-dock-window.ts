/**
 * 从程序坞图标恢复（或切回）一扇窗口：
 * - 窗里正显示这一条内容：再点它的图标就是收回程序坞；
 * - 窗是这颗图标开的、只是内容被翻走了：装回这条的快照，不收起；
 * - 其它条目：不先回坞再出来，按程序坞顺序整屏滑动切过去。
 */

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
  /** 窗里正在显示的那条内容 id（翻篇后会变，没有就是 null） */
  contentIdRef: MutableRefObject<string | null>;
  entriesRef: MutableRefObject<DockEntry[]>;
  id: string;
  modalStack: UseDockModalStackResult['modalStack'];
  /** 把窗重新装回它自己那条的快照（不收起） */
  resetContent: () => void;
  /** 本次恢复的序号：后续恢复会把旧序号顶掉 */
  seq: number;
  currentSeq: () => number;
  windowRef: MutableRefObject<DockWindowSlot | null>;
};

export const restoreDockWindow = ({
  activateEntry,
  beginClosing,
  contentIdRef,
  entriesRef,
  id,
  modalStack,
  resetContent,
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

    // 窗里正显示这一条：点它的图标就是把这一窗收回程序坞
    if (contentIdRef.current === id) {
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

    /*
     * 窗是这颗图标开的、内容已经翻到别处：点它就是「装回我的弹窗」，
     * 不能收起——收起会让它看起来像这一条自己开着。
     */
    if (current.entry.id === id) {
      resetContent();

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
