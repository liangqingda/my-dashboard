import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { EjectVolumeConfirmProps } from './types';

import styles from './index.scss';

/**
 * 推出外接盘确认：推出后盘从系统里消失，当前目录会切回默认目录（收藏第一条或主目录）。
 * 正在读写这块盘的其它程序可能让推出失败，失败原因由中间件带回、页面用通知展示。
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
          推出后这块盘会从系统里卸载，当前目录会切回默认目录；如果还有程序在用这块盘，推出可能失败。
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
