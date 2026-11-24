import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { EjectVolumeConfirmProps } from './types';

import styles from './index.scss';

/**
 * 推出外接盘确认：推出后盘从系统里卸载，当前目录会切回默认目录（收藏第一条或主目录）。
 * 中间件会先释放本站打开的读取句柄再安全卸载（不强制推出）；还有别的程序占着时，
 * 会再弹一扇列出占用进程的确认窗。
 */
const EjectVolumeConfirm = ({
  volume,
  loading,
  onCancel,
  onConfirm,
}: EjectVolumeConfirmProps) => (
  <ConfirmModal
    confirmLabel="推出"
    danger
    description={
      <>
        <Text size="sm">
          要退出「
          <Text component="span" fw={600}>
            {volume?.name ?? '外接盘'}
          </Text>
          」吗？
        </Text>
        <Text c="dimmed" className={styles.mountPoint} mt={4} size="xs">
          {volume?.mountPoint ?? ''}
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          会先释放本站预览打开的读取句柄，再按普通卸载退出这块盘（不会强制推出）。
          如果还有别的程序在读写它，会再问你一次要不要结束那些进程。
        </Text>
      </>
    }
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={volume !== null}
    size={400}
    title="推出外接盘"
  />
);

export default EjectVolumeConfirm;
