import { useState } from 'react';
import { ActionIcon, Skeleton, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import MarkdownPreviewModal from '@/components/MarkdownPreviewModal';
import { useEnglishNotes } from '@/features/english-notes/hooks/useEnglishNotes';
import NotesIndex from '@/features/english-notes/notes-index';
import { formatMoment } from '@/features/english-notes/utils';

import styles from './index.scss';

/** 英语页：列出 learn-english 仓库 learning-record-notes 下的笔记。 */
const English = () => {
  const { notes, generatedAt, repoPath, loading, error, refresh, reload } =
    useEnglishNotes();
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

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p className={styles.errorTitle}>{error}</p>
          <p className={styles.errorHint}>
            开发模式下页面直接读取同级目录 learn-english 的 learning-record-notes；
            如果仓库不在 `../learn-english`，可以用环境变量 ENGLISH_RECORDS_DIR
            指定实际路径。
          </p>
          <button className={styles.retry} onClick={refresh} type="button">
            重新读取
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.mastheadText}>
          <h2 className={styles.title}>英语</h2>
          <p className={styles.line}>
            learning-record-notes 里共 <strong>{notes.length}</strong> 篇笔记，
            点文件名看全文。
          </p>
        </div>
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

      {loading && notes.length === 0 ? (
        <div className={styles.skeletons}>
          <Skeleton h={16} w="40%" />
          <Skeleton h={44} />
          <Skeleton h={44} />
        </div>
      ) : null}

      {!loading && notes.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>这个目录里还没有笔记。</p>
          <p className={styles.emptyHint}>
            在 learn-english 里完成一轮有作答的复习后，practice-learning-records
            会往 learning-record-notes 写一份 Markdown，刷新页面即可看到。
          </p>
        </div>
      ) : null}

      {notes.length > 0 ? (
        <NotesIndex notes={notes} onOpen={openNote} />
      ) : null}

      <footer className={styles.footer}>
        <span className={styles.source}>
          读取自 {repoPath || '../learn-english/learning-record-notes'}
        </span>
        {generatedAt ? <span>更新于 {formatMoment(generatedAt)}</span> : null}
      </footer>

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
