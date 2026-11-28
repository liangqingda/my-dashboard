/**
 * 从程序坞图标 / header 发起的「收」与「关」：收起回坞、X 移除、点正在显示的图标收起。
 *
 * 写成 hook 只是为了守住「渲染期不直接读 ref」的口径：返回的三个动作都在事件里跑。
 *
 * 与 `restore-dock-window` 分开：那边是「点图标要打开哪扇」，这边是「这扇窗怎么离场」，
 * 两边都只读窗口槽与条目引用，动画仍由 `beginClosing` 统一编排。
 */

import type { MutableRefObject } from 'react';

import type { DockWindowSlot } from '../../dock-window';
import type { DockDescriptor, DockEntry } from '../../types';
import { removeDockEntry } from '../../utils/dock-entries';
import { minimizeDockWindow } from '../../utils/dock-minimize';

type DisposalParams = {
  beginClosing: (
    slot: DockWindowSlot,
    removeOnExit: boolean,
    exit: 'minimize' | 'dismiss',
  ) => void;
  entriesRef: MutableRefObject<DockEntry[]>;
  /** 窗挂着的那颗图标条目：收起落点按它 */
  ownerEntryOf: (slot: DockWindowSlot) => DockEntry;
  receiveEntry: (entry: DockEntry, sourceEl: HTMLElement | null) => void;
  /** 窗里正在显示的内容 id（`X` 删的是这条时也要收场） */
  contentIdRef: MutableRefObject<string | null>;
  /** 窗挂着的图标 id */
  ownerIdRef: MutableRefObject<string | null>;
  windowRef: MutableRefObject<DockWindowSlot | null>;
  writeEntries: (next: DockEntry[]) => void;
};

export const useDockWindowDisposal = ({
  beginClosing,
  contentIdRef,
  entriesRef,
  ownerEntryOf,
  ownerIdRef,
  receiveEntry,
  windowRef,
  writeEntries,
}: DisposalParams) => {
  /** 窗里的收起（Esc / 空格 / 遮罩）：坞窗只回挂着的图标，条目与快照都不动 */
  const requestCloseWindow = () => {
    const { current } = windowRef;

    if (current === null) {
      return;
    }

    beginClosing(
      { ...current, contentEntry: ownerEntryOf(current) },
      false,
      'minimize',
    );
  };

  /** X / 编辑模式移除：移除正在展开的那条时先淡出再删 */
  const remove = (id: string) => {
    const { current } = windowRef;

    if (
      current !== null &&
      (current.entry.id === id ||
        ownerIdRef.current === id ||
        contentIdRef.current === id)
    ) {
      if (current.phase === 'closing') {
        return;
      }

      beginClosing({ ...current, removeId: id }, true, 'dismiss');

      return;
    }

    writeEntries(removeDockEntry(entriesRef.current, id));
  };

  /**
   * header 的「收起到程序坞」按钮与 `⌘M`：页面弹窗与坞窗同一套，差异在 `dock-minimize` 里。
   * 返回是否真的收进去了；满员拒收时为 false，调用方不要接着关窗。
   */
  const minimize = (
    descriptor: DockDescriptor,
    sourceEl: HTMLElement | null,
  ): boolean => {
    const { current } = windowRef;

    return minimizeDockWindow({
      beginClosing,
      current,
      descriptor,
      entries: entriesRef.current,
      ownerEntry: current === null ? null : ownerEntryOf(current),
      receiveEntry,
      sourceEl,
      writeEntries,
    });
  };

  return { minimize, remove, requestCloseWindow };
};
