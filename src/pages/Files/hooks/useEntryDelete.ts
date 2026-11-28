import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

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

/** 删除条目编排的入参 */
export type EntryDeleteParams = {
  /**
   * 按路径取确认层要展示的条目；路径已不在当前列表里时返回 null。
   * 文件页从目录清单里取，坞窗从快照条目的本地列表里取，两边共用同一套删除流程。
   */
  resolveEntry: (path: string) => DeletingEntry | null;
  /** 删除成功后的数据刷新；坞窗已在 `onDeleted` 更新本地列表时传空实现 */
  reload: () => Promise<void> | void;
  /** 删除成功、刷新之前通知一次：预览层据此切到下一条，而不是等列表刷新后自己关窗 */
  onDeleted?: (path: string) => void;
};

/**
 * 条目删除编排：记录等待确认删除的条目与请求态，确认后调删除接口并静默刷新列表。
 * 同名冲突 / 不存在等失败由接口收口，这里弹通知；弹窗开关与确认动作都交回页面层接线。
 *
 * 文件页与程序坞预览窗共用这一份：区别只在「路径从哪份列表解析」和「删除后怎么刷新」。
 */
export const useEntryDelete = ({
  resolveEntry,
  reload,
  onDeleted,
}: EntryDeleteParams) => {
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mounted = useMounted();

  /** 等待删除的条目；路径已不在列表里时按 null 收口，弹窗随之关闭 */
  const deletingEntry =
    deletingPath === null ? null : resolveEntry(deletingPath);

  /** 点瓦片上的删除按钮：记下目标，先弹二次确认 */
  const requestDelete = useCallback(
    (path: string) => setDeletingPath(path),
    [],
  );

  /** 取消删除：只关弹窗，不动磁盘 */
  const cancelDelete = useCallback(() => setDeletingPath(null), []);

  /** 切目录前清掉待删除状态，不沿用到新目录 */
  const resetDelete = useCallback(() => setDeletingPath(null), []);

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

      if (!mounted.current) {
        return;
      }

      setDeletingPath(null);
      notifications.show({
        title: '已删除',
        message: deletingEntry?.kind === 'folder' ? '文件夹已删除' : '文件已删除',
        color: 'teal',
        autoClose: 4000,
      });
    } catch (err) {
      if (!mounted.current) {
        return;
      }

      notifications.show({
        title: '删除失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
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
