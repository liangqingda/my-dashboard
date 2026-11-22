import { useCallback, useEffect, useRef, useState } from 'react';

import { useStoredState } from '@/hooks/useStoredState';
import { getErrorMessage } from '@/utils/error';
import { STRING_CODEC } from '@/utils/local-storage';

import { CURRENT_DIR_STORAGE_KEY } from '../constants';
import type { DirListing, UseFilesDirResult } from '../types';
import { fetchFileDir, pickPickedDir } from '../utils/files-api';

/**
 * 读取本机目录的子文件夹与文件列表。
 * 进入页面时按上次记住的目录恢复；没记住过就从主目录开始浏览。`openDir` 切换目录，
 * `refresh` 手动刷新（显示 loading），`reload` 静默同步，供页面标题栏的「刷新当前页面」。
 * 请求竞态由 requestId 收口：过期结果直接忽略。
 */
export const useFilesDir = (): UseFilesDirResult => {
  const [currentDir, setCurrentDir] = useStoredState(
    CURRENT_DIR_STORAGE_KEY,
    STRING_CODEC,
  );
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  /** 把请求结果落到状态上；请求已过期时直接忽略。当前目录以成功扫描到的路径为准并记住 */
  const apply = useCallback(
    (snapshot: DirListing, current: number) => {
      if (requestId.current !== current) {
        return;
      }

      setListing(snapshot);
      setCurrentDir(snapshot.path);
      setError(null);
      setLoading(false);
    },
    [setCurrentDir],
  );

  /** 记录这次请求失败；被主动取消的请求不算失败 */
  const fail = useCallback((caught: unknown, current: number) => {
    if (requestId.current !== current) {
      return;
    }

    if (caught instanceof DOMException && caught.name === 'AbortError') {
      return;
    }

    setError(getErrorMessage(caught, '读取目录失败'));
    setLoading(false);
  }, []);

  /** 跑一次取数；`dir` 为 null 时回落主目录；`showLoading` 控制是否切换整页 loading */
  const runFetch = useCallback(
    async (
      dir: string | null,
      current: number,
      showLoading: boolean,
      signal?: AbortSignal,
    ) => {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const snapshot = await fetchFileDir(dir, signal);

        apply(snapshot, current);
      } catch (caught) {
        fail(caught, current);
        throw caught;
      }
    },
    [apply, fail],
  );

  /**
   * 打开指定目录；空路径回到主目录。路径是否合法由中间件收口，失败不翻动当前目录。
   * 失败原因已记进页面错误条，这里吞掉重抛，避免形成未处理的 Promise 拒绝。
   */
  const openDir = useCallback(
    (dir: string) => {
      const current = requestId.current + 1;

      requestId.current = current;

      void runFetch(dir.trim() || null, current, true).catch(() => {
        /* fail 已把错误写进页面状态，这里不再向上抛 */
      });
    },
    [runFetch],
  );

  /**
   * 调起系统目录选择框：选择框默认定位到当前目录，选中后走 `openDir` 打开；
   * 用户取消则保持当前目录，不报错。
   * 选择过程本身失败时记进页面错误条，重抛在这里吞掉，避免未处理的 Promise 拒绝。
   */
  const pickDir = useCallback(() => {
    void pickPickedDir(currentDir)
      .then((picked) => {
        if ('path' in picked) {
          openDir(picked.path);
        }
      })
      .catch((caught: unknown) => {
        fail(caught, requestId.current);
      });
  }, [currentDir, openDir, fail]);

  /** 手动刷新当前目录（显示 loading）；同上，失败由错误条收口 */
  const refresh = useCallback(() => {
    const current = requestId.current + 1;

    requestId.current = current;

    void runFetch(currentDir || null, current, true).catch(() => {
      /* fail 已把错误写进页面状态，这里不再向上抛 */
    });
  }, [currentDir, runFetch]);

  /**
   * 静默重新读取：不切换 loading，供页面刷新订阅。失败先记进页面错误条，再 rethrow
   * 让 `onPageRefresh` 的发起方弹出「刷新失败」；被主动取消的 AbortError 不算失败。
   */
  const reload = useCallback(async () => {
    const current = requestId.current + 1;

    requestId.current = current;

    try {
      await runFetch(currentDir || null, current, false);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return;
      }

      throw caught;
    }
  }, [currentDir, runFetch]);

  // 首次进入：只按挂载时记住的目录取一次（没记住就取主目录）；之后切目录走 openDir / refresh
  const [initialDir] = useState(currentDir);

  useEffect(() => {
    const controller = new AbortController();
    const current = requestId.current + 1;

    requestId.current = current;

    fetchFileDir(initialDir || null, controller.signal)
      .then(
        (snapshot) => apply(snapshot, current),
        (caught: unknown) => fail(caught, current),
      )
      .catch(() => {
        /* apply / fail 已处理状态，这里只兜住回调自身抛出的异常。 */
      });

    return () => {
      controller.abort();
      requestId.current += 1;
    };
  }, [apply, fail, initialDir]);

  return {
    currentDir,
    error,
    listing,
    loading,
    openDir,
    pickDir,
    refresh,
    reload,
  };
};
