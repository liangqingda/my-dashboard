/**
 * 程序坞里的 Markdown 阅读窗：页面还在时复用页面登记的最新正文与操作能力，
 * 页面已经卸载时不再退回只读快照——窗口自己读写笔记，header 的编辑 / 筛选 / 刷新 / 删除照常出现。
 *
 * 页面弹窗收起只是隐藏（`onMinimize` 保留 active 内容），所以恢复出来的窗口
 * 能与页面里那一扇共用同一套按钮；唯一差别是「收起到程序坞」在坞窗里变成「最小化到程序坞」。
 */

import { useCallback, useMemo, useState } from 'react';

import MarkdownPreviewModal from '@/components/modals/MarkdownPreviewModal';
import type {
  MarkdownPreviewRemove,
  MarkdownPreviewFilter,
} from '@/components/modals/MarkdownPreviewModal';
import { useMarkdownDockActions } from '@/components/modals/MarkdownPreviewModal/DockActions/hooks/useMarkdownDockActions';

import NoteEditor from '@/pages/EnglishNotes/NoteEditor';
import { createNoteRemove } from '@/pages/EnglishNotes/constants';
import { useNotePreviewFilter } from '@/pages/EnglishNotes/hooks/useNotePreviewFilter';
import type { NoteDeleteMode } from '@/pages/EnglishNotes/types';
import {
  deleteEnglishNoteWithNotice,
  saveEnglishNoteWithCommitNotice,
} from '@/pages/EnglishNotes/utils/note-actions';
import { fetchEnglishNote } from '@/pages/EnglishNotes/utils/notes-api';

import type { DockEntry, DockWindowProps } from '../types';

/** 收窄到 Markdown 条目：kind 判别后快照才是这一份 */
type MarkdownEntry = Extract<DockEntry, { kind: 'markdown-preview' }>;

const MarkdownWindowBody = ({
  entry,
  onRequestClose,
}: {
  entry: MarkdownEntry;
  onRequestClose: () => void;
}) => {
  const { markdown: snapshotMarkdown, relativePath, storageScope, title } =
    entry.snapshot;
  const actions = useMarkdownDockActions(entry.id);
  const live = actions?.live === true;
  /** 写盘接口只在开发模式的中间件里有：静态预览下和页面一样不露出保存 / 刷新 / 删除 */
  const canWrite = import.meta.env.DEV;
  const localFilter = useNotePreviewFilter();
  /**
   * 页面卸载后仍要能保存 / 刷新：页面最后一次登记的正文留在 actions 里，
   * 窗口自己的保存 / 刷新结果覆盖在它之上；两处都没有才退回收坞快照。
   */
  const [localMarkdown, setLocalMarkdown] = useState<string | null>(null);
  const markdown =
    localMarkdown ?? actions?.markdown ?? snapshotMarkdown;

  const saveFallback = useCallback(
    (next: string): Promise<{ notice?: string }> =>
      saveEnglishNoteWithCommitNotice(title, next),
    [title],
  );

  const refreshFallback = useCallback(async () => {
    const body = await fetchEnglishNote(title);

    if (body === null) {
      throw new Error('这篇笔记读不到了（可能刚被删掉）');
    }

    setLocalMarkdown(body.content);
  }, [title]);

  const deleteFallback = useMemo(
    () =>
      createNoteRemove(async (mode: NoteDeleteMode) => {
        await deleteEnglishNoteWithNotice(title, mode);
        onRequestClose();
      }),
    [onRequestClose, title],
  );

  const saveMarkdown = useCallback(
    async (next: string): Promise<{ notice?: string }> => {
      if (live && actions.onSave) {
        return actions.onSave(next);
      }

      const result = await saveFallback(next);

      // 写盘成功后才换掉窗口里的正文：保存失败时不能把没落盘的草稿当成已保存内容
      setLocalMarkdown(next);

      return result;
    },
    [actions, live, saveFallback],
  );

  const refreshMarkdown = useCallback(async () => {
    if (live && actions.onRefresh) {
      await actions.onRefresh();

      return;
    }

    await refreshFallback();
  }, [actions, live, refreshFallback]);

  const baseRemove = actions?.remove ?? (canWrite ? deleteFallback : undefined);
  const remove: MarkdownPreviewRemove | undefined =
    baseRemove === undefined
      ? undefined
      : {
          ...baseRemove,
          confirm: async (checkedKeys) => {
            await baseRemove.confirm(checkedKeys);
            onRequestClose();
          },
        };
  const filter: MarkdownPreviewFilter = live && actions.filter
    ? actions.filter
    : localFilter;

  return (
    <MarkdownPreviewModal
      Editor={actions?.Editor ?? NoteEditor}
      dockOrigin="dock"
      filter={filter}
      loading={actions?.loading ?? false}
      markdown={markdown}
      onClose={onRequestClose}
      onNext={actions?.onNext ?? null}
      onPrevious={actions?.onPrevious ?? null}
      onRefresh={canWrite ? refreshMarkdown : null}
      onSave={canWrite ? saveMarkdown : undefined}
      opened
      position={actions?.position}
      relativePath={actions?.relativePath ?? relativePath}
      remove={remove}
      storageScope={storageScope}
      title={title}
    />
  );
};

const MarkdownWindow = ({ entry, onRequestClose }: DockWindowProps) =>
  entry.kind === 'markdown-preview' ? (
    <MarkdownWindowBody entry={entry} onRequestClose={onRequestClose} />
  ) : null;

export default MarkdownWindow;
