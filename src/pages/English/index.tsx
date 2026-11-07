import { useEffect, useState } from 'react';

import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import {
  fetchEnglishNote,
  saveEnglishNote,
} from '@/features/english-notes/api';
import { useEnglishNotes } from '@/features/english-notes/hooks/useEnglishNotes';
import NoteEditor from '@/features/english-notes/note-editor';
import NotesBoard from '@/features/english-notes/notes-board';
import type { EnglishNote } from '@/features/english-notes/types';
import { onPageRefresh } from '@/utils/page-refresh';

import styles from './index.scss';

/** 英语页：把 learning-record-notes 下的笔记按分类分列展示，整页不滚动。 */
const English = () => {
  const { notes, loading, error, refresh, reload, applyNote } =
    useEnglishNotes();
  /** 当前预览的笔记（存内容而不是文件名，打开时就能拿到最新正文） */
  const [active, setActive] = useState<EnglishNote | null>(null);

  const activeIndex =
    active === null
      ? -1
      : notes.findIndex((note) => note.name === active.name);

  // 侧边栏「刷新」按钮：重新读取仓库里的笔记
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 打开预览：先取这一篇的最新正文再开弹窗，避免先显示旧内容再跳变。 */
  const openNote = async (name: string) => {
    const fallback = notes.find((note) => note.name === name) ?? null;

    try {
      const fresh = await fetchEnglishNote(name);

      setActive(fresh ?? fallback);
    } catch {
      // 单篇读取失败就先用列表里的那份，至少还能看
      setActive(fallback);
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

  /** 在笔记列表中循环切换上一篇 / 下一篇。 */
  const step = (delta: number) => {
    if (activeIndex < 0 || notes.length === 0) {
      return;
    }

    const next = (activeIndex + delta + notes.length) % notes.length;

    void openNote(notes[next].name);
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

      <NotesBoard loading={loading} notes={notes} onOpen={openNote} />

      <MarkdownPreviewModal
        Editor={NoteEditor}
        markdown={active?.content ?? ''}
        onClose={() => setActive(null)}
        onNext={notes.length > 1 ? () => step(1) : null}
        onPrevious={notes.length > 1 ? () => step(-1) : null}
        onSave={import.meta.env.DEV ? saveActive : undefined}
        opened={active !== null}
        position={
          active ? { index: activeIndex + 1, total: notes.length } : undefined
        }
        title={active?.name ?? ''}
      />
    </div>
  );
};

export default English;
