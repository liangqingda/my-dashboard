/**
 * 导出音频的二次确认（`ConfirmModal`）：说明「从哪条视频抽、存到哪」，再交给确认 / 取消。
 *
 * 只负责这一层文案与出口，抽取与落盘在弹窗的 `useAudioExport` 里。
 */

import { Text } from '@mantine/core';

import ConfirmModal from '@/components/modals/ConfirmModal';

import type { AudioExportConfirmProps } from './types';

const AudioExportConfirm = ({
  itemName,
  onCancel,
  onConfirm,
  opened,
  targetLabel,
}: AudioExportConfirmProps) => (
  <ConfirmModal
    confirmLabel="导出音频"
    description={
      <>
        <Text size="sm">
          把「
          <Text component="span" fw={600}>
            {itemName}
          </Text>
          」的音轨导出为 WebM 音频吗？
        </Text>
        <Text c="dimmed" mt={4} size="xs">
          将保存到 {targetLabel}；导出期间不影响继续播放，视频越长耗时越久。
        </Text>
      </>
    }
    onCancel={onCancel}
    onConfirm={onConfirm}
    opened={opened}
    size={400}
    title="导出音频"
  />
);

export default AudioExportConfirm;
