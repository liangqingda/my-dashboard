import { useCallback, useEffect, useRef, useState } from 'react';

import type { EnglishNote, UseEnglishNotesResult } from '../types';

import { getErrorMessage } from '@/utils/error';

import { fetchEnglishNotes } from '../utils/notes-api';

const EMPTY_NOTES: EnglishNote[] = [];

/**
 * 读取 learn-english 仓库 learning-record-notes 下的全部笔记。
 * 首次进入页面时自动读取；refresh 手动同步（显示 loading），
 * reload 静默同步，供打开预览前拉取仓库最新内容。
 */
export const useEnglishNotes = (): UseEnglishNotesResult => {
  const [notes, setNotes] = useState<EnglishNote[]>(EMPTY_NOTES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  /** 把请求结果落到状态上；请求已过期时直接忽略。 */
  const apply = useCallback(
    (
      snapshot: Awaited<ReturnType<typeof fetchEnglishNotes>>,
      current: number,
    ) => {
      if (requestId.current !== current) {
        return;
      }

      setNotes(snapshot.notes);
      setError(null);
      setLoading(false);
    },
    [],
  );

  /** 记录这次请求失败；被主动取消的请求不算失败。 */
  const fail = useCallback((caught: unknown, current: number) => {
    if (requestId.current !== current) {
      return;
    }

    if (caught instanceof DOMException && caught.name === 'AbortError') {
      return;
    }

    setError(getErrorMessage(caught, '读取笔记失败'));
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    const current = requestId.current + 1;

    requestId.current = current;

    setLoading(true);
    setError(null);

    fetchEnglishNotes()
      .then(
        (snapshot) => apply(snapshot, current),
        (caught: unknown) => fail(caught, current),
      )
      .catch(() => {
        /* apply / fail 已处理状态，这里只兜住回调自身抛出的异常。 */
      });
  }, [apply, fail]);

  /** 静默重新读取：不切换 loading，用于侧边栏刷新。 */
  const reload = useCallback(async () => {
    const current = requestId.current + 1;

    requestId.current = current;

    try {
      apply(await fetchEnglishNotes(), current);
    } catch (caught) {
      fail(caught, current);
    }
  }, [apply, fail]);

  /** 单篇更新：保存或打开预览后只替换这一条，不整页重拉。 */
  const applyNote = useCallback((note: EnglishNote) => {
    setNotes((current) =>
      current.some((item) => item.name === note.name)
        ? current.map((item) => (item.name === note.name ? note : item))
        : [note, ...current],
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const current = requestId.current + 1;

    requestId.current = current;

    fetchEnglishNotes(controller.signal)
      .then(
        (snapshot) => apply(snapshot, current),
        (caught: unknown) => fail(caught, current),
      )
      .catch(() => {
        /* 同上：避免未处理的 Promise 拒绝。 */
      });

    return () => {
      controller.abort();
      requestId.current += 1;
    };
  }, [apply, fail]);

  return { notes, loading, error, refresh, reload, applyNote };
};
