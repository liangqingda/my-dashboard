import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { DeleteEntryConfirmProps } from './types';

/**
 * 删除条目确认：文件夹连同内部全部内容一起递归删除，文件直接删除，均不可恢复，先问一句再动手。
 */
const DeleteEntryConfirm = ({
  entry,
  loading,
  onCancel,
  onConfirm,
}: DeleteEntryConfirmProps) => (
  <ConfirmModal
    confirmLabel="删除"
    danger
    description={
      <>
        <Text size="sm">
          要删除「
          <Text component="span" fw={600}>
            {entry?.name ?? ''}
          </Text>
          」吗？
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          {entry?.kind === 'folder' && (entry.itemCount ?? 0) > 0
            ? `文件夹内 ${entry.itemCount} 个项目会一并删除；删除后不可恢复。`
            : '删除后不可恢复。'}
        </Text>
      </>
    }
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={entry !== null}
    size={380}
    title={entry?.kind === 'file' ? '删除文件' : '删除文件夹'}
  />
);

export default DeleteEntryConfirm;
