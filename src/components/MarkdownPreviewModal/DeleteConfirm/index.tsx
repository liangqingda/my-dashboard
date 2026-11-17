/**
 * 删除前的二次确认层（叠在主预览上面的一层）。
 *
 * 它只做两件事：把「删掉会发生什么」原样说一遍（文案由调用方给，组件不知道文档落在哪里），
 * 以及给两个出口——取消 / 删除。确认后真正删除的动作也在调用方手里。
 *
 * 排版上只有两段：标题区（「删除这个文档？」+ 被删文档的路径）与说明块，按钮收在最后一行。
 * 标题里不塞长路径：文件名一长就会把「？」挤到下一行，路径独立成一行 monospace 更好读。
 */

import { Button, Group, Modal, Text } from '@mantine/core';

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
    classNames={{
      body: styles.body,
      content: styles.content,
      header: styles.header,
      title: styles.title,
    }}
    closeButtonProps={{ 'aria-label': '关闭删除确认' }}
    closeOnClickOutside={!loading}
    closeOnEscape={!loading}
    onClose={onCancel}
    opened={opened}
    overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
    radius="md"
    size={420}
    title={
      <div>
        <Text className={styles.headTitle}>删除这个文档？</Text>
        <Text className={styles.headPath}>{title}</Text>
      </div>
    }
    transitionProps={{ duration: 140, transition: 'fade' }}
    withCloseButton={!loading}
  >
    <Text className={styles.description}>{description}</Text>
    <Group className={styles.footer} gap="sm" justify="flex-end" wrap="nowrap">
      <Button disabled={loading} onClick={onCancel} size="sm" variant="default">
        取消
      </Button>
      <Button
        className={styles.deleteButton}
        loading={loading}
        onClick={onConfirm}
        size="sm"
      >
        删除
      </Button>
    </Group>
  </Modal>
);

export default DeleteConfirm;
