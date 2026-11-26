/**
 * 列表拖拽的总接线：走弹窗（`modal`）还是直接拖到文件夹（`direct`）在这里分叉，
 * 页面只拿这一份统一入口去接列表的四个事件，不必自己按模式分支。
 *
 * 两套模式共用同一批事件：
 * - 起拖：弹窗模式把条目往侧栏待拖拽区拖（`usePendingDrag`），直接拖模式只点亮自己的拖拽态；
 * - 经过 / 离开 / 松手落点：弹窗模式交给移动会话，直接拖模式交给 `useDirectMove`，自己搬。
 */

import type { DragEvent } from 'react';

import type { FileEntry, FolderEntry, MoveMode } from '../types';

import { useDirectMove } from './useDirectMove';
import type { useDragPending } from './use-drag-pending';
import type { useEntryActions } from './useEntryActions';
import { usePendingDrag } from './usePendingDrag';

/** 入参：两套既有状态、当前目录里的条目（认路径用）与设置里的走法 */
export type UseFilesDragArgs = {
  /** 待拖拽区 */
  pending: ReturnType<typeof useDragPending>;
  /** 条目动作编排（弹窗会话也在里面） */
  entryActions: ReturnType<typeof useEntryActions>;
  /** 当前目录的子文件夹与文件：从列表拖进待拖拽区时按路径认条目 */
  folders: FolderEntry[];
  files: FileEntry[];
  /** 设置里的拖拽走法 */
  moveMode: MoveMode;
};

/** 列表拖拽的统一入口 */
export const useFilesDrag = ({
  pending,
  entryActions,
  folders,
  files,
  moveMode,
}: UseFilesDragArgs) => {
  /**
   * 直接拖拽移动：列表里拖起条目不开弹窗，目标就是列表里的文件夹瓦片；
   * 搬完把搬走的条目从待拖拽区摘掉。
   */
  const direct = useDirectMove({
    moveEntry: entryActions.moveEntryTo,
    onMoved: (movedEntries) =>
      pending.removePaths(movedEntries.map((entry) => entry.path)),
  });

  /** 弹窗模式下的起拖与收件：列表不立即开弹窗，先把条目往侧栏待拖拽区拖 */
  const { handleDragStartEntry, handleTrayDrop } = usePendingDrag({
    pending,
    entryActions,
    folders,
    files,
  });

  const isDirect = moveMode === 'direct';

  /** 拖拽结束（松手 / Esc / 落在别处）：两套拖拽状态的收尾一次做完 */
  const handleDragEnd = () => {
    pending.endTrayDrag();
    entryActions.endDrag();
    direct.end();
  };

  /**
   * 列表里起拖：走弹窗就交给待拖拽区那套；走直接拖就自己跟住这批条目
   * （拖的这条本来就在待拖拽区里 → 整批一起走，否则只走它自己）
   */
  const handleListDragStart = (entry: FolderEntry | FileEntry) => {
    if (isDirect) {
      direct.begin(pending.has(entry.path) ? pending.entries : [entry]);

      return;
    }

    handleDragStartEntry(entry);
  };

  /** 「拖拽全部」起拖：弹窗模式开弹窗，直接拖模式只点亮拖拽态 */
  const handleDragAll = () => {
    if (isDirect) {
      direct.begin(pending.entries);

      return;
    }

    entryActions.dragStartEntries(pending.entries);
  };

  /** 拖拽经过文件夹：直接拖模式亮放置目标，待拖拽区里的那一格算禁用 */
  const handleDragOverFolder = (path: string, event: DragEvent<HTMLElement>) => {
    if (isDirect) {
      direct.dragOver(path, event, pending.has(path));

      return;
    }

    entryActions.dragOverFolder(path, event);
  };

  const handleDragLeaveFolder = () => {
    if (isDirect) {
      direct.leave();

      return;
    }

    entryActions.dragLeaveFolder();
  };

  /** 松手放进文件夹：直接拖模式自己搬，弹窗那套走会话的落点 */
  const handleDropFolder = (path: string) => {
    if (isDirect) {
      void direct.drop(path);

      return;
    }

    entryActions.dropFolder(path);
  };

  /** 直接拖模式下的高亮与禁用提示走 direct，弹窗模式仍走会话 */
  const dragSource = isDirect
    ? (direct.dragging?.[0]?.path ?? null)
    : entryActions.dragSource;
  const dropTarget = isDirect ? direct.hoverPath : entryActions.dropTarget;
  const dropBlockedPath = isDirect ? direct.blockedPath : null;
  /** 正在搬的进度：弹窗模式取会话那份，直接拖模式取自己的 */
  const moveProgress = isDirect ? direct.progress : entryActions.dragMove.progress;

  return {
    dragSource,
    dropBlockedPath,
    dropTarget,
    handleDragAll,
    handleDragEnd,
    handleDragLeaveFolder,
    handleDragOverFolder,
    handleListDragStart,
    handleDropFolder,
    handleTrayDrop,
    isDirect,
    moveProgress,
  };
};
