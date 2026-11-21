/**
 * 二次确认弹窗（通用业务组件，基于 `FreeModal` 封装）：不可逆操作动手之前先问一句。
 *
 * 只做四件事：把「会发生什么」原样说一遍（文案由调用方给，组件不知道对象落在哪）、
 * 给一段可选的额外内容（如「这次删什么」的勾选项）、给两个出口（取消 / 确认）、
 * 请求进行中把整扇窗锁住（关不掉、按钮 loading）。真正的动作永远在调用方手里。
 *
 * 排版按「先读、再选、最后做」：说明块 → 额外内容 → 一条细线 → 靠右的两个按钮。
 * 外壳（框体、header、遮罩、Esc / 空格）全交给 `FreeModal` 的 `height="auto"`，
 * 这里只排正文。
 */

import { Button, Group } from '@mantine/core';

import FreeModal from '@/components/modals/FreeModal';

import type { ConfirmModalProps } from './types';

import styles from './index.scss';

const ConfirmModal = ({
  cancelLabel = '取消',
  children,
  closeLabel = '关闭确认',
  confirmDisabled = false,
  confirmLabel = '确定',
  danger = false,
  description,
  loading = false,
  onCancel,
  onConfirm,
  opened,
  size = 420,
  title,
}: ConfirmModalProps) => (
  <FreeModal
    closeButton={!loading}
    closeLabel={closeLabel}
    closeOnEscape={!loading}
    height="auto"
    onClose={onCancel}
    opened={opened}
    size={size}
    title={title}
  >
    <div className={styles.description}>{description}</div>
    {children}
    <div className={styles.footer}>
      <Group gap="sm" justify="flex-end" wrap="nowrap">
        <Button
          disabled={loading}
          onClick={onCancel}
          size="sm"
          variant="default"
        >
          {cancelLabel}
        </Button>
        <Button
          className={danger ? styles.dangerButton : undefined}
          disabled={confirmDisabled}
          loading={loading}
          onClick={onConfirm}
          size="sm"
        >
          {confirmLabel}
        </Button>
      </Group>
    </div>
  </FreeModal>
);

export default ConfirmModal;
