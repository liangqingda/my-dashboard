import { useEffect, useRef, useState } from 'react';

import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import {
  fetchEnglishNote,
  saveEnglishNote,
} from '@/features/english-notes/api';
import { useEnglishNotes } from '@/features/english-notes/hooks/useEnglishNotes';
import NoteEditor from '@/features/english-notes/note-editor';
import NotesBoard from '@/features/english-notes/notes-board';
import type { EnglishNote } from '@/features/english-notes/types';
import { getNoteCategory, isBoardNote } from '@/features/english-notes/utils';
import { onPageRefresh } from '@/utils/page-refresh';

import styles from './index.scss';

/** 英语页：把 learning-record-notes 下的笔记按分类分列展示，整页不滚动。 */
const English = () => {
  const { notes, loading, error, refresh, reload, applyNote } =
    useEnglishNotes();
  /** 当前预览的笔记（存内容而不是文件名，打开时就能拿到最新正文） */
  const [active, setActive] = useState<EnglishNote | null>(null);
  /** 打开请求的序号：连点两篇时只认最后一次 */
  const openSeq = useRef(0);

  /** 只看板上真正展示的笔记：`mixed` / `paper` 不占翻页计数 */
  const boardNotes = notes.filter((note) => isBoardNote(note.name));
  /**
   * 翻页与计数都只在本列内进行：计数是「本篇在本列第几 / 本列共几」，
   * 上一篇 / 下一篇也只在该列内循环，不跨列跳到别的分类。
   */
  const columnNotes = active
    ? boardNotes.filter(
        (note) => getNoteCategory(note.name) === getNoteCategory(active.name),
      )
    : [];
  const activeIndex =
    active === null
      ? -1
      : columnNotes.findIndex((note) => note.name === active.name);

  // 侧边栏「刷新」按钮：重新读取仓库里的笔记
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 打开预览：先取这一篇的最新正文再开弹窗，避免先显示旧内容再跳变。 */
  const openNote = async (name: string) => {
    openSeq.current += 1;

    const seq = openSeq.current;
    const fallback = notes.find((note) => note.name === name) ?? null;

    try {
      const fresh = await fetchEnglishNote(name);

      if (seq === openSeq.current) {
        setActive(fresh ?? fallback);
      }
    } catch {
      // 单篇读取失败就先用列表里的那份，至少还能看
      if (seq === openSeq.current) {
        setActive(fallback);
      }
    }
  };

  /** 保存弹窗里的编辑：写回源文件、提交记录仓库，再只刷这一篇。 */
  const saveActive = async (markdown: string) => {
    if (!active) {
      return {};
    }

    const saved = await saveEnglishNote(active.name, markdown);

    try {
      const fresh = await fetchEnglishNote(active.name);

      if (fresh) {
        setActive(fresh);
        applyNote(fresh);
      }
    } catch {
      // 刷新失败不影响保存结果，下次打开会重新取
    }

    return saved.commitError
      ? { notice: `自动提交失败：${saved.commitError}` }
      : {};
  };

  /** 弹窗 header 的刷新：只重取当前这一篇，原地更新正文。 */
  const refreshActive = async () => {
    if (!active) {
      return;
    }

    const fresh = await fetchEnglishNote(active.name);

    if (fresh) {
      setActive(fresh);
      applyNote(fresh);
    }
  };

  /** 在本列笔记中循环切换上一篇 / 下一篇。 */
  const step = (delta: number) => {
    if (activeIndex < 0 || columnNotes.length === 0) {
      return;
    }

    const next =
      (activeIndex + delta + columnNotes.length) % columnNotes.length;

    void openNote(columnNotes[next].name);
  };

  return (
    <div className={styles.page}>
      {error ? (
        <div className={styles.errorBar}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retry} onClick={refresh} type="button">
            重新读取
          </button>
        </div>
      ) : null}

      <NotesBoard loading={loading} notes={boardNotes} onOpen={openNote} />

      <MarkdownPreviewModal
        // 换一篇就重挂弹窗，避免上一篇的「已保存」提示和编辑态漏到下一篇
        Editor={NoteEditor}
        key={active?.name ?? 'closed'}
        markdown={active?.content ?? ''}
        onClose={() => setActive(null)}
        onNext={columnNotes.length > 1 ? () => step(1) : null}
        onPrevious={columnNotes.length > 1 ? () => step(-1) : null}
        onRefresh={import.meta.env.DEV ? refreshActive : null}
        onSave={import.meta.env.DEV ? saveActive : undefined}
        opened={active !== null}
        position={
          active
            ? { index: activeIndex + 1, total: columnNotes.length }
            : undefined
        }
        title={active?.name ?? ''}
      />
    </div>
  );
};

export default English;
