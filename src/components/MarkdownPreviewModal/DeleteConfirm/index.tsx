/**
 * 删除前的二次确认层（叠在主预览上面的一层）。
 *
 * 它只做两件事：把「删掉会发生什么」原样说一遍（文案由调用方给，组件不知道文档落在哪里），
 * 以及给两个出口——取消 / 删除。确认后真正删除的动作也在调用方手里。
 */

import { Button, Group, Modal, Stack, Text } from '@mantine/core';

import type { DeleteConfirmProps } from '../types';

import styles from './index.scss';

const DeleteConfirm = ({
  description,
  loading,
  onCancel,
  onConfirm,
  opened,
  title,
}: DeleteConfirmProps) => (
  <Modal
    centered
    closeButtonProps={{ 'aria-label': '关闭删除确认' }}
    closeOnClickOutside={!loading}
    closeOnEscape={!loading}
    onClose={onCancel}
    opened={opened}
    size="sm"
    title={`删除「${title}」？`}
    transitionProps={{ duration: 140, transition: 'fade' }}
    withCloseButton={!loading}
  >
    <Stack gap="lg">
      <Text className={styles.description} size="sm">
        {description}
      </Text>
      <Group gap="sm" justify="flex-end">
        <Button disabled={loading} onClick={onCancel} variant="default">
          取消
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          删除
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteConfirm;
