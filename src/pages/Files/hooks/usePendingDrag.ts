/**
 * 批量状态下的起拖与收件：待拖拽区非空时，列表里的拖拽先不开移动弹窗，
 * 而是「把这一批 / 刚拖的那一条往侧栏拖」，松手落在待拖拽区才收进来。
 *
 * 为什么单独成 hook：这段判定同时要用待拖拽区、条目动作和当前目录的条目表，
 * 留在页面里只是把 JSX 挤长；语义本身只有这两件事，放这里更清楚。
 */

import { useCallback, useMemo } from 'react';

import type { FileEntry, FolderEntry } from '../types';

import type { useDragPending } from './use-drag-pending';
import type { useEntryActions } from './useEntryActions';

/** 批量状态下列表拖拽的两个回调 */
export type PendingDragHandlers = {
  /** 从列表起拖一条：批量时先往待拖拽区拖，不直接开弹窗 */
  handleDragStartEntry: (entry: FolderEntry | FileEntry) => void;
  /** 从列表拖到待拖拽区松手：按路径把当前目录里的条目收进来 */
  handleTrayDrop: (paths: string[]) => void;
};

export const usePendingDrag = (
  pending: ReturnType<typeof useDragPending>,
  entryActions: ReturnType<typeof useEntryActions>,
  folders: FolderEntry[],
  files: FileEntry[],
): PendingDragHandlers => {
  /** 按路径反查当前目录条目：跨目录拖来的路径认不出来，直接丢掉 */
  const known = useMemo(() => {
    const map = new Map<string, FolderEntry | FileEntry>();

    for (const folder of folders) {
      map.set(folder.path, folder);
    }

    for (const file of files) {
      map.set(file.path, file);
    }

    return map;
  }, [files, folders]);

  /** 批量时拖的是整批；非批量时保持原语义（直接开移动弹窗） */
  const handleDragStartEntry = useCallback(
    (entry: FolderEntry | FileEntry) => {
      if (!pending.active) {
        entryActions.dragStartEntry(entry);

        return;
      }

      pending.beginTrayDrag(
        pending.has(entry.path) ? pending.entries : [...pending.entries, entry],
      );
    },
    [entryActions, pending],
  );

  const handleTrayDrop = useCallback(
    (paths: string[]) => {
      const batch = paths.flatMap((path) => {
        const entry = known.get(path);

        return entry === undefined ? [] : [entry];
      });

      if (batch.length > 0) {
        pending.addMany(batch);
      }
    },
    [known, pending],
  );

  return { handleDragStartEntry, handleTrayDrop };
};
