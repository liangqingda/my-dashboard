import { Text } from '@mantine/core';

import ConfirmModal from '@/components/ConfirmModal';

import type { DeleteRecordConfirmProps } from './types';

/**
 * 删除确认：记录一旦删掉就不在复习库里了，先问一句再动手。
 * 笔记文件不会被这条删除动到（记录仓库的 `delete-record` 只删记录），所以这里把这一点说清。
 */
const DeleteRecordConfirm = ({
  record,
  loading,
  onCancel,
  onConfirm,
}: DeleteRecordConfirmProps) => (
  <ConfirmModal
    confirmLabel="删除"
    danger
    description={
      <>
        <Text size="sm">
          要删除「
          <Text component="span" fw={600}>
            {record?.title ?? ''}
          </Text>
          」吗？
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          只删复习库里这条记录，同知识点的笔记文件会保留；删除后自动提交并推送记录仓库。
        </Text>
      </>
    }
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={record !== null}
    size={380}
    title="删除记录"
  />
);

export default DeleteRecordConfirm;
