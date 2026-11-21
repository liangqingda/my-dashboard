import { Modal } from '@mantine/core';

import RecordDetailBody from '../RecordDetailBody';

import type { RecordDetailModalProps } from './types';

/**
 * 记录详情弹窗：只负责弹窗外壳与开关；详情按 ID 交给 `RecordDetailBody`，
 * 并用 `key={recordId}` 保证换一条记录就重新挂载、不会串数据。
 */
const RecordDetailModal = ({ onClose, recordId }: RecordDetailModalProps) => (
  <Modal
    centered
    onClose={onClose}
    opened={recordId !== null}
    size="lg"
    title="记录详情"
  >
    {recordId === null ? null : (
      <RecordDetailBody key={recordId} recordId={recordId} />
    )}
  </Modal>
);

export default RecordDetailModal;
