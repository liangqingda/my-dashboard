/**
 * 删除前的二次确认层（叠在主预览上面的一层）。
 *
 * 它只做两件事：把「删掉会发生什么」原样说一遍（文案由调用方给，组件不知道文档落在哪里），
 * 以及给两个出口——取消 / 删除。确认后真正删除的动作也在调用方手里。
 *
 * 排版上分三段：标题区（危险语气图标 + 「删除这个文档？」 + 被删文档的路径）、
 * 说明块（调用方给的那段后果）、收口行（一条细线 + 左侧 Esc 提示 + 右侧两个按钮）。
 * 标题里不塞长路径：文件名一长就会把「？」挤到下一行，路径独立成一行 monospace 更好读。
 */

import { Button, Group, Kbd, Modal, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

import type { DeleteConfirmProps } from '../types';

import styles from './index.scss';

/** 标题区图标的尺寸与线宽，跟 header 那一排图标同一档 */
const ICON_SIZE = 17;
const ICON_STROKE = 1.8;

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
      <div className={styles.head}>
        <div aria-hidden="true" className={styles.badge}>
          <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
        </div>
        <div className={styles.headText}>
          <Text className={styles.headTitle}>删除这个文档？</Text>
          <Text className={styles.headPath}>{title}</Text>
        </div>
      </div>
    }
    transitionProps={{ duration: 140, transition: 'fade' }}
    withCloseButton={!loading}
  >
    <Text className={styles.description}>{description}</Text>
    <Group
      className={styles.footer}
      gap="md"
      justify={loading ? 'flex-end' : 'space-between'}
      wrap="nowrap"
    >
      {/* 删除中 Esc 被挡住，这条提示也跟着收掉——按键当时不生效，就别写在那里 */}
      {loading ? null : (
        <span className={styles.hint}>
          <Kbd size="xs">Esc</Kbd>
          取消
        </span>
      )}
      <Group gap="sm">
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
    </Group>
  </Modal>
);

export default DeleteConfirm;
