import { Button, Group, Modal, Stack, Text } from '@mantine/core';

import type { DeleteRecordConfirmProps } from './types';

import styles from './index.scss';

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
  <Modal
    centered
    closeOnClickOutside={!loading}
    onClose={onCancel}
    opened={record !== null}
    size="sm"
    title="删除记录"
  >
    <Stack gap="md">
      <Text size="sm">
        要删除「<Text component="span" fw={600}>{record?.title ?? ''}</Text>
        」吗？
      </Text>
      <Text c="dimmed" size="xs">
        只删复习库里这条记录，同知识点的笔记文件会保留；删除后自动提交并推送记录仓库。
      </Text>
      <Group className={styles.actions} justify="flex-end">
        <Button disabled={loading} onClick={onCancel} size="xs" variant="default">
          取消
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm} size="xs">
          删除
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteRecordConfirm;
