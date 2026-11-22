import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { FolderEntry } from '../types';
import { deleteEntry } from '../utils/files-api';

/**
 * 文件夹删除编排：记录等待确认删除的文件夹与请求态，确认后调删除接口并静默刷新列表。
 * 同名冲突 / 不存在等失败由接口收口，这里弹通知；弹窗开关与确认动作都交回页面层接线。
 */
export const useFolderDelete = (
  folders: FolderEntry[],
  reload: () => Promise<void>,
) => {
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** 等待删除的文件夹；路径已不在列表里时按 null 收口，弹窗随之关闭 */
  const deletingFolder =
    folders.find((folder) => folder.path === deletingPath) ?? null;

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
      await reload();
      setDeletingPath(null);
      notifications.show({
        title: '已删除',
        message: '文件夹已删除',
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
    deletingFolder,
    deleteLoading: loading,
    requestDelete,
    resetDelete,
  };
};
