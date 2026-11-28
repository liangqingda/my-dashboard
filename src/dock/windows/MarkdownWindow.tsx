/**
 * 程序坞里的 Markdown 阅读窗：页面还在时复用页面登记的最新正文与操作能力，
 * 页面已经卸载时由窗口自己按笔记名恢复正文与同一套动作，header 与翻篇不会因为换页少一块。
 *
 * 两条路只差数据源：页面路径用登记的 `MarkdownDockActions`，后备路径用页面同一个
 * `useDockMarkdownNote`（内部就是 `useActiveNote` + `useEnglishNotes`）。
 */

import { useMemo } from 'react';

import MarkdownPreviewModal from '@/components/modals/MarkdownPreviewModal';
import type { MarkdownDockActions } from '@/components/modals/MarkdownPreviewModal';
import { useMarkdownDockActions } from '@/components/modals/MarkdownPreviewModal/DockActions/hooks/useMarkdownDockActions';

import NoteEditor from '@/pages/EnglishNotes/NoteEditor';
import { createNoteRemove } from '@/pages/EnglishNotes/constants';
import { useNotePreviewFilter } from '@/pages/EnglishNotes/hooks/useNotePreviewFilter';
import type { NoteDeleteMode } from '@/pages/EnglishNotes/types';

import type { DockEntry, DockWindowProps } from '../types';

import { useDockMarkdownNote } from './hooks/useDockMarkdownNote';

/** 收窄到 Markdown 条目：kind 判别后快照才是这一份 */
type MarkdownEntry = Extract<DockEntry, { kind: 'markdown-preview' }>;

/** 页面还挂载：登记的动作就是页面那一套，窗口只负责转发 */
const MarkdownLiveBody = ({
  actions,
  entryId,
  onRequestClose,
}: {
  actions: MarkdownDockActions;
  entryId: string;
  onRequestClose: () => void;
}) => (
  <MarkdownPreviewModal
    Editor={actions.Editor ?? NoteEditor}
    dockId={entryId}
    dockOrigin="dock"
    filter={actions.filter}
    loading={actions.loading ?? false}
    markdown={actions.markdown}
    onClose={onRequestClose}
    onNext={actions.onNext ?? null}
    onPrevious={actions.onPrevious ?? null}
    onRefresh={actions.onRefresh ?? null}
    onSave={actions.onSave}
    opened
    position={actions.position}
    relativePath={actions.relativePath}
    remove={actions.remove}
    storageScope={actions.storageScope}
    title={actions.title}
  />
);

/** 页面不在：按笔记名恢复正文，翻篇 / 保存 / 刷新 / 删除都走页面同一套 hook */
const MarkdownFallbackBody = ({
  entry,
  initialMarkdown,
  initialRelativePath,
  initialTitle,
  onRequestClose,
}: {
  entry: MarkdownEntry;
  initialMarkdown?: string;
  initialRelativePath?: string;
  initialTitle?: string;
  onRequestClose: () => void;
}) => {
  const {
    markdown: snapshotMarkdown,
    relativePath: snapshotRelativePath,
    storageScope,
    title: snapshotTitle,
  } = entry.snapshot;
  const canWrite = import.meta.env.DEV;
  const filter = useNotePreviewFilter();
  const title = initialTitle ?? snapshotTitle;
  const note = useDockMarkdownNote({ title });
  const noteReady = note.active !== null;
  const { remove: removeNote } = note;

  const remove = useMemo(
    () =>
      canWrite && noteReady
        ? createNoteRemove(async (mode: NoteDeleteMode) => {
            await removeNote(mode);
            onRequestClose();
          })
        : undefined,
    [canWrite, noteReady, onRequestClose, removeNote],
  );

  return (
    <MarkdownPreviewModal
      Editor={NoteEditor}
      dockId={entry.id}
      dockOrigin="dock"
      filter={filter}
      loading={note.loading}
      markdown={note.content ?? initialMarkdown ?? snapshotMarkdown}
      onClose={onRequestClose}
      onNext={note.onNext}
      onPrevious={note.onPrevious}
      onRefresh={canWrite && noteReady ? note.refresh : null}
      onSave={canWrite && noteReady ? note.save : undefined}
      opened
      position={note.position}
      relativePath={note.relativePath ?? initialRelativePath ?? snapshotRelativePath}
      remove={remove}
      storageScope={storageScope}
      title={note.title}
    />
  );
};

const MarkdownWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: MarkdownEntry;
  onRequestClose: () => void;
}) => {
  const actions = useMarkdownDockActions(entry.id);

  if (actions?.live === true) {
    return (
      <MarkdownLiveBody
        actions={actions}
        entryId={entry.id}
        onRequestClose={onRequestClose}
      />
    );
  }

  return (
    <MarkdownFallbackBody
      entry={entry}
      initialMarkdown={actions?.markdown || undefined}
      initialRelativePath={actions?.relativePath || undefined}
      initialTitle={actions?.title || undefined}
      onRequestClose={onRequestClose}
    />
  );
};

const MarkdownWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'markdown-preview' ? (
    <MarkdownWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default MarkdownWindow;
