import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchEnglishRecords } from '@/features/english-records/api';
import type { EnglishRecord } from '@/features/english-records/types';

export type UseEnglishRecordsResult = {
  /** 归一化后的全部记录 */
  records: EnglishRecord[];
  /** 快照生成时间（ISO 8601） */
  generatedAt: string;
  /** 记录仓库路径 */
  repoPath: string;
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因 */
  error: string | null;
  /** 重新读取一次 */
  refresh: () => void;
};

const EMPTY_RECORDS: EnglishRecord[] = [];

/**
 * 读取 learn-english 仓库的全部学习记录。
 * 首次进入页面时自动读取，调用 refresh 可手动同步仓库最新内容。
 */
export const useEnglishRecords = (): UseEnglishRecordsResult => {
  const [records, setRecords] = useState<EnglishRecord[]>(EMPTY_RECORDS);
  const [generatedAt, setGeneratedAt] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  /** 把请求结果落到状态上；返回 false 表示这次结果已经过期。 */
  const apply = useCallback(
    (snapshot: Awaited<ReturnType<typeof fetchEnglishRecords>>, current: number) => {
      if (requestId.current !== current) {
        return;
      }

      setRecords(snapshot.records);
      setGeneratedAt(snapshot.generatedAt);
      setRepoPath(snapshot.repoPath);
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

    setError(caught instanceof Error ? caught.message : '读取学习记录失败');
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    const current = requestId.current + 1;

    requestId.current = current;

    setLoading(true);
    setError(null);

    fetchEnglishRecords()
      .then(
        (snapshot) => apply(snapshot, current),
        (caught: unknown) => fail(caught, current),
      )
      .catch(() => {
        /* apply / fail 已经处理过状态，这里只兜住回调自身抛出的异常。 */
      });
  }, [apply, fail]);

  useEffect(() => {
    const controller = new AbortController();
    const current = requestId.current + 1;

    requestId.current = current;

    fetchEnglishRecords(controller.signal)
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

  return { records, generatedAt, repoPath, loading, error, refresh };
};
