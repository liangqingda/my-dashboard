/**
 * 程序坞里的学习记录详情窗：快照只有 ID 与标题，正文由 `RecordDetailBody` 按 ID 自取，
 * 所以换页、刷新之后照样能打开同一条记录。
 */

import RecordDetailModal from '@/pages/EnglishKnowledgeBase/RecordDetailModal';

import type { DockWindowProps } from '../types';

const RecordWindow = ({ entry, onRequestClose }: DockWindowProps) => {
  if (entry.kind !== 'record-detail') {
    return null;
  }

  return (
    <RecordDetailModal
      dockOrigin="dock"
      onClose={onRequestClose}
      recordId={entry.snapshot.recordId}
      title={entry.snapshot.title}
    />
  );
};

export default RecordWindow;
