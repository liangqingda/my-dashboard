/**
 * 程序坞里的学习记录详情窗：快照只有 ID 与标题，正文由 `RecordDetailBody` 按 ID 自取，
 * 所以换页、刷新之后照样能打开同一条记录。
 *
 * 删除与上一条 / 下一条和页面详情共用同一套编排：记录列表按记录 ID 重新取，
 * 动作 hook 不在这里另写一份。
 */

import DeleteRecordConfirm from '@/pages/EnglishKnowledgeBase/DeleteRecordConfirm';
import { useRecordDelete } from '@/pages/EnglishKnowledgeBase/hooks/useRecordDelete';
import { useRecordDetailNav } from '@/pages/EnglishKnowledgeBase/hooks/useRecordDetailNav';
import { useReviewRecords } from '@/pages/EnglishKnowledgeBase/hooks/useReviewRecords';
import RecordDetailModal from '@/pages/EnglishKnowledgeBase/RecordDetailModal';
import type { RecordSummary } from '@/pages/EnglishKnowledgeBase/types';

import type { DockWindowProps } from '../types';

/** 记录窗正文：拿到记录 ID 之后才挂载，hook 都在这里无条件调用 */
type RecordWindowBodyProps = {
  entryId: string;
  recordId: string;
  title: string;
  onRequestClose: () => void;
};

const RecordWindowBody = ({
  entryId,
  recordId,
  title,
  onRequestClose,
}: RecordWindowBodyProps) => {
  const records = useReviewRecords();
  const detail = useRecordDetailNav({
    initialId: recordId,
    records: records.records,
  });
  const record =
    detail.activeIndex >= 0
      ? (records.records[detail.activeIndex] ?? null)
      : null;
  /** 列表还没回来时也先用快照给删除入口，header 不因取数晚一步少一颗按钮 */
  const deleteTarget: RecordSummary = record ?? {
    categoryKey: '',
    id: recordId,
    masteredTenStreak: null,
    masteryScore: null,
    nextReviewAt: null,
    status: 'learning',
    title,
    updatedAt: '',
  };
  const deletion = useRecordDelete({
    onDeleted: (id) => {
      records.removeRecord(id);
      detail.closeIfDeleted(id);
    },
    onAfterDelete: onRequestClose,
  });

  return (
    <>
      <RecordDetailModal
        confirming={deletion.pendingDelete !== null}
        dockId={entryId}
        dockOrigin="dock"
        nav={detail.activeIndex >= 0 ? detail.nav : undefined}
        onClose={onRequestClose}
        onRequestDelete={() => deletion.requestDelete(deleteTarget)}
        recordId={detail.activeId}
        title={detail.activeTitle ?? title}
      />
      <DeleteRecordConfirm
        loading={deletion.deleting}
        onCancel={deletion.cancelDelete}
        onConfirm={deletion.confirmDelete}
        record={deletion.pendingDelete}
      />
    </>
  );
};

const RecordWindow = ({ entry, onRequestClose }: DockWindowProps) => {
  if (entry.kind !== 'record-detail') {
    return null;
  }

  return (
    <RecordWindowBody
      entryId={entry.id}
      onRequestClose={onRequestClose}
      recordId={entry.snapshot.recordId}
      title={entry.snapshot.title}
    />
  );
};

export default RecordWindow;
