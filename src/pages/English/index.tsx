import { useState } from 'react';
import { ActionIcon, Skeleton, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import { useEnglishNotes } from '@/features/english-notes/hooks/useEnglishNotes';
import NotesIndex from '@/features/english-notes/notes-index';

import styles from './index.scss';

/** 英语页：只展示 learning-record-notes 目录下的 md 文件名。 */
const English = () => {
  const { notes, loading, error, refresh, reload } = useEnglishNotes();
  const [activeName, setActiveName] = useState<string | null>(null);

  const activeIndex =
    activeName === null
      ? -1
      : notes.findIndex((note) => note.name === activeName);
  const active = activeIndex >= 0 ? notes[activeIndex] : null;

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
      <header className={styles.masthead}>
        <h2 className={styles.title}>Learning record notes</h2>
        <Tooltip label="重新读取笔记" withArrow>
          <ActionIcon
            aria-label="重新读取笔记"
            className={styles.refresh}
            loading={loading}
            onClick={refresh}
            size="md"
            variant="subtle"
          >
            <IconRefresh size={16} stroke={1.8} />
          </ActionIcon>
        </Tooltip>
      </header>

      {error ? (
        <div className={styles.error}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retry} onClick={refresh} type="button">
            重新读取
          </button>
        </div>
      ) : null}

      {loading && notes.length === 0 ? (
        <Skeleton h={40} mt={12} />
      ) : null}

      {!error && !loading && notes.length === 0 ? (
        <p className={styles.empty}>这个目录里还没有笔记。</p>
      ) : null}

      {notes.length > 0 ? (
        <NotesIndex notes={notes} onOpen={openNote} />
      ) : null}

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
