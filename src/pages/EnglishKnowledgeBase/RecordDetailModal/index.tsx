import { useState } from 'react';
import { ScrollArea } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeModal from '@/components/modals/FreeModal';
import { useModalFullscreen } from '@/components/modals/FreeModal/hooks/useModalFullscreen';
import type { FreeModalDock } from '@/components/modals/FreeModal/types';

import RecordDetailBody from '../RecordDetailBody';
import { RECORD_DETAIL_STORAGE_KEY } from '../constants';

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
  dockId,
  dockOrigin = 'page',
  nav,
  onClose,
  onRequestDelete,
  recordId,
  title,
}: RecordDetailModalProps) => {
  /** 页面弹窗的全屏是记住的阅读偏好：关掉重开、换一条记录都不重置 */
  const { fullscreen: storedFullscreen, toggle: toggleStored } =
    useModalFullscreen(RECORD_DETAIL_STORAGE_KEY);
  /** 程序坞恢复窗从普通尺寸出来，不继承页面偏好；但窗口里照样可以切全屏 */
  const [dockFullscreen, setDockFullscreen] = useState(false);
  const fullscreen = dockOrigin === 'dock' ? dockFullscreen : storedFullscreen;
  const toggleFullscreen =
    dockOrigin === 'dock'
      ? () => setDockFullscreen((current) => !current)
      : toggleStored;

  /**
   * 程序坞描述：只存 ID 与标题，正文由恢复窗口按 ID 自取（列表摘要里的标题够撑起 header）；
   * 删除确认开着时不让收。
   */
  const dock: FreeModalDock | undefined =
    recordId === null
      ? undefined
      : {
          disabled: confirming,
          id: dockId ?? `record-detail:${recordId}`,
          kind: 'record-detail',
          origin: dockOrigin,
          snapshot: { recordId, title: title ?? '记录详情' },
          title: title ?? '记录详情',
        };

  return (
    <FreeModal
      beforeMinimize={fullscreen ? toggleFullscreen : undefined}
      closeButton
      closeLabel="关闭记录详情"
      closeOnEscape={!confirming}
      closeOnSpace={!confirming}
      copy={
        recordId === null
          ? undefined
          : { message: '记录 ID 已复制', text: recordId }
      }
      dock={dock}
      fullscreen={{
        active: fullscreen,
        onToggle: toggleFullscreen,
        showToggle: true,
      }}
      headerTail={
        recordId === null || !onRequestDelete ? undefined : (
          <FreeIconAction
            label="删除这条记录（Delete）"
            onClick={onRequestDelete}
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        )
      }
      nav={recordId === null ? undefined : nav}
      onClose={onClose}
      onRequestDelete={onRequestDelete ?? null}
      opened={recordId !== null}
      shortcutsEnabled={!confirming}
      size="min(860px, 94vw)"
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
