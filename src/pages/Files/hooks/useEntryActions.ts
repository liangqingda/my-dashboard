import { useState, type DragEvent } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { FileEntry, FolderEntry } from '../types';
import { createFolder, moveEntry, renameEntry } from '../utils/files-api';

/** 等待弹窗改名的一条目：类型决定弹窗标题与说明文案 */
export type RenamingEntry = {
  /** 条目绝对路径，提交改名时回传 */
  path: string;
  /** 当前条目名，文本域初始值 */
  name: string;
  /** 条目类型：文件夹 / 文件 */
  kind: 'folder' | 'file';
};

/**
 * 条目写操作编排：新建文件夹、弹窗改名、拖拽移动的临时状态与接口调用收口在这里。
 * 成功后静默刷新列表；失败弹红色通知，不改原位置。弹窗类的删除编排归 `useEntryDelete`。
 */
export const useEntryActions = (
  currentDir: string | null,
  reload: () => Promise<void>,
) => {
  /** 正在弹窗改名的条目；null 表示改名弹窗关闭 */
  const [renamingEntry, setRenamingEntry] = useState<RenamingEntry | null>(null);
  /** 改名请求进行中：弹窗按钮转圈并禁用 */
  const [renameLoading, setRenameLoading] = useState(false);
  /** 拖拽中的条目路径与悬停的放置目标文件夹路径 */
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  /** 清掉拖拽临时状态 */
  const clearDrag = () => {
    setDragSource(null);
    setDropTarget(null);
  };

  /** 切目录前清掉改名与拖拽临时状态，不沿用到新目录 */
  const resetTransient = () => {
    setRenamingEntry(null);
    clearDrag();
  };

  /** 新建文件夹：后端落一个默认名条目，刷新后打开改名弹窗 */
  const createEntry = async () => {
    if (!currentDir) {
      return;
    }

    try {
      const created = await createFolder(currentDir);

      await reload();
      setRenamingEntry({ path: created.path, name: created.name, kind: 'folder' });
    } catch (err) {
      notifications.show({
        title: '新建文件夹失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    }
  };

  /** 提交改名：成功后刷新列表；失败弹提示并退出改名态，条目保留原名 */
  const renameCommit = async (path: string, name: string) => {
    setRenameLoading(true);

    try {
      await renameEntry(path, name);
      await reload();
      setRenamingEntry(null);
    } catch (err) {
      notifications.show({
        title: '重命名失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setRenamingEntry(null);
      setRenameLoading(false);
    }
  };

  /** 打开某条目的改名弹窗（瓦片上的编辑按钮） */
  const editEntry = (entry: FolderEntry | FileEntry) =>
    setRenamingEntry({
      path: entry.path,
      name: entry.name,
      kind: 'category' in entry ? 'file' : 'folder',
    });

  /** 关掉改名弹窗，不提交 */
  const closeRename = () => setRenamingEntry(null);

  /** 拖拽移动：同名冲突 / 移入自身后代由后端拒绝，失败不改动原位置 */
  const moveEntryTo = async (source: string, targetDir: string) => {
    if (!source || source === targetDir) {
      clearDrag();

      return;
    }

    try {
      await moveEntry(source, targetDir);
      await reload();
      notifications.show({
        title: '已移动',
        message: '条目已移入目标文件夹',
        color: 'teal',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        title: '移动失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      clearDrag();
    }
  };

  const dragOverFolder = (path: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const { dataTransfer } = event;

    dataTransfer.dropEffect = 'move';
    setDropTarget(path);
  };

  const dropFolder = (path: string) => {
    if (dragSource) {
      void moveEntryTo(dragSource, path);
    }
  };

  return {
    clearDrag,
    dragLeaveFolder: () => setDropTarget(null),
    dragOverFolder,
    dragSource,
    dragStartEntry: setDragSource,
    dropFolder,
    dropTarget,
    editEntry,
    closeRename,
    renameCommit,
    renameLoading,
    renamingEntry,
    resetTransient,
    createEntry,
  };
};
