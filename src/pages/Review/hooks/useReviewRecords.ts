import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/utils/error';

import type {
  RecordCategory,
  RecordSummary,
  UseReviewRecordsResult,
} from '../types';
import { fetchReviewRecords } from '../utils/records-api';

const EMPTY_RECORDS: RecordSummary[] = [];
const EMPTY_CATEGORIES: RecordCategory[] = [];

/**
 * 读取 learn-english 两个记录目录的全部摘要（按更新时间倒序，插件已排好）。
 * 首次进入页面时自动读取；refresh 手动同步（显示 loading），
 * reload 静默同步，供页面标题栏的「刷新当前页面」。
 */
export const useReviewRecords = (): UseReviewRecordsResult => {
  const [records, setRecords] = useState<RecordSummary[]>(EMPTY_RECORDS);
  const [categories, setCategories] = useState<RecordCategory[]>(
    EMPTY_CATEGORIES,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  /** 把请求结果落到状态上；请求已过期时直接忽略。 */
  const apply = useCallback(
    (
      snapshot: Awaited<ReturnType<typeof fetchReviewRecords>>,
      current: number,
    ) => {
      if (requestId.current !== current) {
        return;
      }

      setRecords(snapshot.records);
      setCategories(snapshot.categories);
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

    setError(getErrorMessage(caught, '读取记录失败'));
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    const current = requestId.current + 1;

    requestId.current = current;

    setLoading(true);
    setError(null);

    fetchReviewRecords()
      .then(
        (snapshot) => apply(snapshot, current),
        (caught: unknown) => fail(caught, current),
      )
      .catch(() => {
        /* apply / fail 已处理状态，这里只兜住回调自身抛出的异常。 */
      });
  }, [apply, fail]);

  /**
   * 静默重新读取：不切换 loading，供页面刷新订阅。失败先记进页面错误条，再 rethrow
   * 让 `onPageRefresh` 的发起方弹出「刷新失败」；被主动取消的 AbortError 不算失败。
   */
  const reload = useCallback(async () => {
    const current = requestId.current + 1;

    requestId.current = current;

    try {
      apply(await fetchReviewRecords(), current);
    } catch (caught) {
      fail(caught, current);

      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return;
      }

      throw caught;
    }
  }, [apply, fail]);

  /**
   * 一条被删掉了：直接从列表里摘掉。
   * 不必整页重拉——列表已经知道这条不在了，重拉只会换回同一份结果再闪一下 loading。
   */
  const removeRecord = useCallback((id: string) => {
    setRecords((current) => current.filter((record) => record.id !== id));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const current = requestId.current + 1;

    requestId.current = current;

    fetchReviewRecords(controller.signal)
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

  return {
    categories,
    error,
    loading,
    records,
    refresh,
    reload,
    removeRecord,
  };
};
