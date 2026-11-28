/**
 * 程序坞 Markdown 窗的后备阅读状态：页面不在时按笔记名自取正文，
 * 并用页面同一个 `useActiveNote` 完成翻篇、保存、刷新与删除。
 *
 * 页面还在时窗口走登记的 `MarkdownDockActions`，不实例化这份后备状态。
 */

import { useCallback, useEffect, useRef } from 'react';

import { useActiveNote } from '@/pages/EnglishNotes/hooks/useActiveNote';
import { useEnglishNotes } from '@/pages/EnglishNotes/hooks/useEnglishNotes';
import { getNoteRelativePath } from '@/pages/EnglishNotes/utils/notes';

/** 后备阅读状态的入参 */
type Params = {
  /** 收进程序坞时记下的笔记名（相对路径） */
  title: string;
};

/**
 * 按笔记名恢复一扇可读写的预览窗。
 *
 * @returns 当前笔记摘要、正文、位置与页面同一套动作
 */
export const useDockMarkdownNote = ({ title }: Params) => {
  const list = useEnglishNotes();
  const note = useActiveNote({
    notes: list.notes,
    onDeleted: list.removeSummary,
    onSummary: list.applySummary,
    /* 坞窗后备路径：骨架第一帧就挂上，不压页面弹窗那段加载延迟 */
    dockFallback: true,
  });
  const bootstrapped = useRef(false);
  const { open } = note;

  // 列表回来之后按快照里的笔记名打开一次；列表里没有这篇就不再取正文（窗里给占位说明）
  useEffect(() => {
    if (bootstrapped.current || !list.notes.some((item) => item.name === title)) {
      return;
    }

    bootstrapped.current = true;
    void open(title);
  }, [list.notes, open, title]);

  /** 翻篇后当前笔记以窗口里的 active 为准，不能一直按收坞时那篇算位置 */
  const activeName = note.active?.name ?? title;
  const index = list.notes.findIndex((item) => item.name === activeName);
  const total = list.notes.length;

  /** 翻到上一条 / 下一条：范围与页面一样是全部笔记 */
  const step = useCallback(
    (delta: number) => {
      if (index < 0 || total === 0) {
        return;
      }

      const next = (index + delta + total) % total;

      void open(list.notes[next].name);
    },
    [index, list.notes, open, total],
  );

  return {
    active: note.active,
    content: note.content,
    /** 摘要列表读失败的原因：窗里据此区分「笔记没了」和「没读到」 */
    error: list.error,
    /*
     * 列表加载也算 loading：正文要等摘要回来才按名去取，这一段如果不算加载，
     * 窗里会先闪一下「笔记已不在仓库」的占位，再被真正文顶掉。
     */
    loading: note.loading || list.loading,
    onNext: total > 1 ? () => step(1) : null,
    onPrevious: total > 1 ? () => step(-1) : null,
    position: index >= 0 ? { index: index + 1, total } : undefined,
    refresh: note.refresh,
    relativePath: note.active
      ? getNoteRelativePath(note.active.name)
      : undefined,
    remove: note.remove,
    save: note.save,
    title: activeName,
  };
};
