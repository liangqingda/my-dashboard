/**
 * 列表拖拽的总接线：走弹窗（`modal`）还是直接拖到文件夹（`direct`）在这里分叉，
 * 页面只拿这一份统一入口去接列表的四个事件，不必自己按模式分支。
 *
 * 两套模式共用同一批事件：
 * - 起拖：弹窗模式把条目往侧栏待拖拽区拖（`usePendingDrag`），直接拖模式只点亮自己的拖拽态；
 * - 经过 / 离开 / 松手落点：弹窗模式交给移动会话，直接拖模式交给 `useDirectMove`，自己搬。
 */

import { useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';

import type { FileEntry, FolderEntry, MoveMode } from '../types';
import { parentDirOf } from '../utils/files';

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
  /** 当前目录：直接拖模式下拖到空白处＝搬进这一层 */
  currentDir: string;
};

/** 列表拖拽的统一入口 */
export const useFilesDrag = ({
  pending,
  entryActions,
  folders,
  files,
  moveMode,
  currentDir,
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
  const { handleDragStartEntry, handleTogglePendingPreview, handleTrayDrop } =
    usePendingDrag(pending, entryActions, folders, files);

  const isDirect = moveMode === 'direct';

  /** 拖拽结束（松手 / Esc / 落在别处）：两套拖拽状态的收尾一次做完 */
  const handleDragEnd = useCallback(() => {
    pending.endTrayDrag();
    entryActions.endDrag();
    direct.end();
  }, [direct, entryActions, pending]);

  /**
   * 列表里起拖：走弹窗就交给待拖拽区那套；走直接拖就自己跟住这批条目
   * （拖的这条本来就在待拖拽区里 → 整批一起走，否则只走它自己）
   */
  const handleListDragStart = useCallback(
    (entry: FolderEntry | FileEntry) => {
      if (isDirect) {
        direct.begin(pending.has(entry.path) ? pending.entries : [entry]);

        return;
      }

      handleDragStartEntry(entry);
    },
    [direct, handleDragStartEntry, isDirect, pending],
  );

  /** 「拖拽全部」起拖：弹窗模式开弹窗，直接拖模式只点亮拖拽态 */
  const handleDragAll = useCallback(() => {
    if (isDirect) {
      direct.begin(pending.entries);

      return;
    }

    entryActions.dragStartEntries(pending.entries);
  }, [direct, entryActions, isDirect, pending.entries]);

  /** 拖拽经过文件夹：直接拖模式亮放置目标，待拖拽区里的那一格算禁用 */
  const handleDragOverFolder = useCallback(
    (path: string, event: DragEvent<HTMLElement>) => {
      if (isDirect) {
        direct.dragOver(path, event, pending.has(path));

        return;
      }

      entryActions.dragOverFolder(path, event);
    },
    [direct, entryActions, isDirect, pending],
  );

  const handleDragLeaveFolder = useCallback(() => {
    if (isDirect) {
      direct.leave();

      return;
    }

    entryActions.dragLeaveFolder();
  }, [direct, entryActions, isDirect]);

  /**
   * 松手落在列表的空白处：直接拖模式下等于「搬进当前这一层」；
   * 弹窗模式没有这个语义（落点只有文件夹瓦片和弹窗里的当前层），给 undefined 让列表别接。
   */
  const handleDropBlank = useMemo(
    () => (isDirect ? () => void direct.drop(currentDir) : undefined),
    [currentDir, direct, isDirect],
  );

  /** 松手放进文件夹：直接拖模式自己搬，弹窗那套走会话的落点 */
  const handleDropFolder = useCallback(
    (path: string) => {
      if (isDirect) {
        void direct.drop(path);

        return;
      }

      entryActions.dropFolder(path);
    },
    [direct, entryActions, isDirect],
  );

  /**
   * 正在被拖走的条目：直接拖模式拖的可能是一批，全都要弱化；
   * 弹窗模式列表被弹窗盖住，只留会话那一条也够用
   */
  const dragPaths = useMemo(() => {
    if (isDirect) {
      return (direct.dragging ?? []).map((entry) => entry.path);
    }

    return entryActions.dragSource !== null ? [entryActions.dragSource] : [];
  }, [direct.dragging, entryActions.dragSource, isDirect]);

  const dropTarget = isDirect ? direct.hoverPath : entryActions.dropTarget;
  const dropBlockedPath = isDirect ? direct.blockedPath : null;
  /** 直接拖模式正拖的那一批：交给拖拽影像跟着指针画，否则拖起来屏幕上看不出拖的是什么 */
  const dragEntries = isDirect ? direct.dragging : null;
  /** 那条瓦片的快照（起拖那一刻拷的）：影像按它原样画 */
  const dragImage = isDirect ? direct.image : null;
  const folderProgress = isDirect ? direct.progress : null;
  /**
   * 「拖拽全部」无处可去才禁用：当前这一层没有子文件夹，**且**手里这几条本来就都在这一层
   * （拖到空白处＝移进当前目录，移过去等于没动）。只要有一条带自别处，这一层就能接。
   */
  const dragAllDisabled =
    isDirect &&
    folders.length === 0 &&
    !pending.entries.some((entry) => parentDirOf(entry.path) !== currentDir);

  return {
    dragAllDisabled,
    dragEntries,
    dragImage,
    dragPaths,
    dropBlockedPath,
    dropTarget,
    handleDragAll,
    folderProgress,
    handleDragEnd,
    handleDragLeaveFolder,
    handleDropBlank,
    handleDragOverFolder,
    handleListDragStart,
    handleDropFolder,
    handleTogglePendingPreview,
    handleTrayDrop,
    isDirect,
  };
};
