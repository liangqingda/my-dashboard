import { ScrollArea } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

import HeaderIconAction from '@/components/buttons/HeaderIconAction';
import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';

import RecordDetailBody from '../RecordDetailBody';
import { RECORD_FULLSCREEN_STORAGE_KEY } from '../constants';

import type { RecordDetailModalProps } from './types';

import styles from './index.scss';

/** header 图标的尺寸与线宽：与其它阅读弹窗同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

/**
 * 记录详情弹窗（业务弹窗）：外壳与翻页、计数、全屏都交给 `FreeModal`，
 * 这里只决定标题、header 操作（删除）、正文与全屏偏好存在哪。
 * 复制入口在正文「记录 ID」那一行（值后面），header 的 `C` 键仍然走同一个 ID。
 * 详情正文按 ID 取，`key={recordId}` 保证换一条记录就重新挂载、不会串数据。
 */
const RecordDetailModal = ({
  confirming = false,
  nav,
  onClose,
  onRequestDelete,
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
      closeOnEscape={!confirming}
      closeOnSpace={!confirming}
      copy={
        recordId === null
          ? undefined
          : { message: '记录 ID 已复制', text: recordId }
      }
      fullscreen={{ active: fullscreen, onToggle: toggle }}
      headerTail={
        recordId === null || !onRequestDelete ? undefined : (
          <HeaderIconAction label="删除这条记录（Delete）" onClick={onRequestDelete}>
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </HeaderIconAction>
        )
      }
      nav={recordId === null ? undefined : nav}
      onClose={onClose}
      onRequestDelete={onRequestDelete ?? null}
      opened={recordId !== null}
      shortcutsEnabled={!confirming}
      size="min(760px, 92vw)"
      title={title ?? '记录详情'}
      trapFocus={!confirming}
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
