import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { FileEntry, FolderEntry } from '../types';
import { deleteEntry } from '../utils/files-api';

/** 等待删除的一条目：类型决定确认弹窗与成功通知文案 */
export type DeletingEntry = {
  /** 条目名（不含路径） */
  name: string;
  /** 条目类型：文件夹 / 文件 */
  kind: 'folder' | 'file';
  /** 文件夹直属条目数；文件没有这个字段 */
  itemCount?: number;
};

/**
 * 条目删除编排：记录等待确认删除的条目与请求态，确认后调删除接口并静默刷新列表。
 * 同名冲突 / 不存在等失败由接口收口，这里弹通知；弹窗开关与确认动作都交回页面层接线。
 */
export const useEntryDelete = (
  folders: FolderEntry[],
  files: FileEntry[],
  reload: () => Promise<void>,
  /** 删除成功、重读列表之前通知一次：预览层据此切到下一条，而不是等列表刷新后自己关窗 */
  onDeleted?: (path: string) => void,
) => {
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** 等待删除的条目；路径已不在列表里时按 null 收口，弹窗随之关闭 */
  const matchFolder = folders.find((folder) => folder.path === deletingPath);
  const matchFile = matchFolder
    ? null
    : files.find((file) => file.path === deletingPath) ?? null;

  let deletingEntry: DeletingEntry | null = null;

  if (matchFolder) {
    deletingEntry = {
      name: matchFolder.name,
      kind: 'folder',
      itemCount: matchFolder.itemCount,
    };
  } else if (matchFile) {
    deletingEntry = { name: matchFile.name, kind: 'file' };
  }

  /** 点瓦片上的删除按钮：记下目标，先弹二次确认 */
  const requestDelete = (path: string) => setDeletingPath(path);

  /** 取消删除：只关弹窗，不动磁盘 */
  const cancelDelete = () => setDeletingPath(null);

  /** 切目录前清掉待删除状态，不沿用到新目录 */
  const resetDelete = () => setDeletingPath(null);

  const confirmDelete = async () => {
    if (!deletingPath) {
      return;
    }

    setLoading(true);

    try {
      await deleteEntry(deletingPath);
      // 先按旧顺序把预览挪到下一条，再重读：那时列表里还有这一条，位置一定找得到
      onDeleted?.(deletingPath);
      await reload();
      setDeletingPath(null);
      notifications.show({
        title: '已删除',
        message: deletingEntry?.kind === 'folder' ? '文件夹已删除' : '文件已删除',
        color: 'teal',
        autoClose: 4000,
      });
    } catch (err) {
      notifications.show({
        title: '删除失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    cancelDelete,
    confirmDelete,
    deletingEntry,
    deleteLoading: loading,
    requestDelete,
    resetDelete,
  };
};
