import { useEffect, useState } from 'react';

import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import { useEnglishNotes } from '@/features/english-notes/hooks/useEnglishNotes';
import NotesBoard from '@/features/english-notes/notes-board';
import { onPageRefresh } from '@/utils/page-refresh';

import styles from './index.scss';

/** 英语页：把 learning-record-notes 下的笔记按分类分列展示，整页不滚动。 */
const English = () => {
  const { notes, loading, error, refresh, reload } = useEnglishNotes();
  const [activeName, setActiveName] = useState<string | null>(null);

  const activeIndex =
    activeName === null
      ? -1
      : notes.findIndex((note) => note.name === activeName);
  const active = activeIndex >= 0 ? notes[activeIndex] : null;

  // 侧边栏「刷新」按钮：重新读取仓库里的笔记
  useEffect(() => onPageRefresh(reload), [reload]);

  /** 打开预览：先静默重新读盘，避免看到仓库里已被改掉的旧正文。 */
  const openNote = (name: string) => {
    setActiveName(name);
    reload();
  };

  /** 在笔记列表中循环切换上一篇 / 下一篇。 */
  const step = (delta: number) => {
    if (activeIndex < 0 || notes.length === 0) {
      return;
    }

    const next = (activeIndex + delta + notes.length) % notes.length;

    setActiveName(notes[next].name);
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
        markdown={active?.content ?? ''}
        onClose={() => setActiveName(null)}
        onNext={notes.length > 1 ? () => step(1) : null}
        onPrevious={notes.length > 1 ? () => step(-1) : null}
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
