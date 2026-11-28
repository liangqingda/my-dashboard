/** 英语笔记的预览窗：把页面数据与弹窗 props 的拼装从页面主体里拆出来。 */

import { useMemo } from 'react';

import MarkdownPreviewModal from '@/components/modals/MarkdownPreviewModal';
import type { MarkdownPreviewFilter } from '@/components/modals/MarkdownPreviewModal';

import type { NoteDeleteMode, NoteSummary } from '../types';
import { NOTES_STORAGE_SCOPE, createNoteRemove } from '../constants';
import NoteEditor from '../NoteEditor';
import { getNoteRelativePath } from '../utils/notes';

type NotePreviewModalProps = {
  active: NoteSummary | null;
  body: string | null;
  filter: MarkdownPreviewFilter;
  loading: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onNext: (() => void) | null;
  onPrevious: (() => void) | null;
  onRefresh: (() => Promise<void>) | null;
  onSave: ((markdown: string) => Promise<{ notice?: string }>) | undefined;
  opened: boolean;
  position: { index: number; total: number } | undefined;
  remove: ((mode?: NoteDeleteMode) => Promise<void>) | undefined;
};

const NotePreviewModal = ({
  active,
  body,
  filter,
  loading,
  onClose,
  onMinimize,
  onNext,
  onPrevious,
  onRefresh,
  onSave,
  opened,
  position,
  remove,
}: NotePreviewModalProps) => {
  const removeNote = useMemo(
    () => (remove === undefined ? undefined : createNoteRemove(remove)),
    [remove],
  );

  return (
    <MarkdownPreviewModal
      Editor={NoteEditor}
      filter={filter}
      loading={loading}
      markdown={body ?? ''}
      onClose={onClose}
      onMinimize={onMinimize}
      onNext={onNext}
      onPrevious={onPrevious}
      onRefresh={onRefresh}
      onSave={onSave}
      opened={opened}
      position={position}
      relativePath={active ? getNoteRelativePath(active.name) : undefined}
      remove={removeNote}
      storageScope={NOTES_STORAGE_SCOPE}
      title={active?.name ?? ''}
    />
  );
};

export default NotePreviewModal;
