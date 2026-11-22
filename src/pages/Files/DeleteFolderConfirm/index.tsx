import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { DeleteFolderConfirmProps } from './types';

/**
 * 删除文件夹确认：文件夹连同内部全部内容一起递归删除，不可恢复，先问一句再动手。
 */
const DeleteFolderConfirm = ({
  folder,
  loading,
  onCancel,
  onConfirm,
}: DeleteFolderConfirmProps) => (
  <ConfirmModal
    confirmLabel="删除"
    danger
    description={
      <>
        <Text size="sm">
          要删除「
          <Text component="span" fw={600}>
            {folder?.name ?? ''}
          </Text>
          」吗？
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          {folder && folder.itemCount > 0
            ? `文件夹内 ${folder.itemCount} 个项目会一并删除；删除后不可恢复。`
            : '删除后不可恢复。'}
        </Text>
      </>
    }
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={folder !== null}
    size={380}
    title="删除文件夹"
  />
);

export default DeleteFolderConfirm;
