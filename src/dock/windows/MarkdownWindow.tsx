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

/**
 * 笔记已经不在仓库时的占位正文：快照不再存全文，取不到就是取不到，
 * 空正文会看起来像「这篇本来就是空的」，这里明确说明并给出出口。
 */
const MISSING_NOTE_MARKDOWN =
  '> 这篇笔记已经不在仓库里了，可以关闭这扇窗，或从程序坞移除它。';

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

  /*
   * 正文取不到时的说明按原因分开：读失败说读失败，仓库里确实没有才说没有——
   * 两种空态混成一句，用户会以为笔记被删了。
   */
  const unavailableMarkdown =
    note.error === null ? MISSING_NOTE_MARKDOWN : `> 读取笔记失败：${note.error}`;

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
      markdown={note.content ?? initialMarkdown ?? unavailableMarkdown}
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
