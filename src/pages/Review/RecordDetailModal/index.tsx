import { ScrollArea } from '@mantine/core';

import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';

import RecordDetailBody from '../RecordDetailBody';
import { RECORD_FULLSCREEN_STORAGE_KEY } from '../constants';

import type { RecordDetailModalProps } from './types';

import styles from './index.scss';

/**
 * 记录详情弹窗（业务弹窗）：外壳与翻页、计数、全屏都交给 `FreeModal`，
 * 这里只决定标题、正文与全屏偏好存在哪。
 * 详情正文按 ID 取，`key={recordId}` 保证换一条记录就重新挂载、不会串数据。
 */
const RecordDetailModal = ({
  nav,
  onClose,
  recordId,
  title,
}: RecordDetailModalProps) => {
  /** 全屏是记住的阅读偏好：关掉重开、换一条记录都不重置 */
  const { fullscreen, toggle } = useModalFullscreen(
    RECORD_FULLSCREEN_STORAGE_KEY,
  );

  return (
    <FreeModal
      closeButton
      closeLabel="关闭记录详情"
      closeOnEscape
      fullscreen={{ active: fullscreen, onToggle: toggle }}
      nav={recordId === null ? undefined : nav}
      onClose={onClose}
      opened={recordId !== null}
      size="min(760px, 92vw)"
      title={title ?? '记录详情'}
    >
      {recordId === null ? null : (
        <ScrollArea className={styles.scroll} scrollbars="y" type="auto">
          <div className={styles.paper}>
            <RecordDetailBody key={recordId} recordId={recordId} />
          </div>
        </ScrollArea>
      )}
    </FreeModal>
  );
};

export default RecordDetailModal;
