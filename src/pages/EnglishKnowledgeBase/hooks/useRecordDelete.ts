/**
 * 知识库记录的删除编排：页面详情与程序坞详情窗共用。
 *
 * 删除只动记录仓库，同知识点的笔记文件保留；成功后按接口返回的提交结果给提示。
 * 关窗与列表摘除交给调用方，页面与坞窗各自接自己的数据源。
 */

import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { RecordSummary } from '../types';
import { deleteReviewRecord } from '../utils/records-api';
import { describeDelete } from '../utils/records';

/** 删除编排的入参 */
type Params = {
  /** 删除成功、提示之后通知：页面摘列表并关详情，坞窗关窗 */
  onAfterDelete?: (id: string) => void;
  /** 删除成功后、提示之前通知：页面先摘列表，避免详情还指着已删记录 */
  onDeleted?: (id: string) => void;
};

/**
 * 管理记录删除的确认、请求态与结果提示。
 *
 * @returns 待确认记录、请求态与三个动作
 */
export const useRecordDelete = ({ onAfterDelete, onDeleted }: Params = {}) => {
  const [pendingDelete, setPendingDelete] = useState<RecordSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** 点删除图标：先记下目标，弹确认框，不直接删 */
  const requestDelete = useCallback((record: RecordSummary) => {
    setPendingDelete(record);
  }, []);

  /** 取消删除：请求已经发出后不允许假装取消 */
  const cancelDelete = useCallback(() => {
    if (!deleting) {
      setPendingDelete(null);
    }
  }, [deleting]);

  const confirmDelete = async () => {
    if (pendingDelete === null) {
      return;
    }

    setDeleting(true);

    try {
      const { id } = pendingDelete;
      const { commit } = await deleteReviewRecord(id);

      onDeleted?.(id);

      notifications.show({
        color: commit.error ? 'yellow' : 'teal',
        message: describeDelete(commit),
      });
      setPendingDelete(null);
      onAfterDelete?.(id);
    } catch (caught) {
      notifications.show({
        color: 'red',
        message: getErrorMessage(caught, '删除记录失败'),
      });
    } finally {
      setDeleting(false);
    }
  };

  return {
    cancelDelete,
    confirmDelete,
    deleting,
    pendingDelete,
    requestDelete,
  };
};
