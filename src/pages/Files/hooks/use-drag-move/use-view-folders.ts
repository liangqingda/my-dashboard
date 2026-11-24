import { useEffect } from 'react';

import { getErrorMessage } from '@/utils/error';

import { fetchFileDir } from '../../utils/files-api';

import type { UseViewFoldersArgs } from './types';
import { stripSelf } from './utils';

/**
 * 当前层还没有子文件夹结果时读一次盘：切层即中止，迟到的响应按路径挡回去。
 * 结果先写缓存再回填 `view`——来回进出同一层不必再扫一遍目录。
 */
export const useViewFolders = ({
  cacheRef,
  folders,
  path,
  sessionRef,
  setError,
  setView,
}: UseViewFoldersArgs) => {
  useEffect(() => {
    if (path === null || folders !== null) {
      return undefined;
    }

    const controller = new AbortController();

    fetchFileDir(path, controller.signal)
      .then((listing) => {
        // 被拖条目自己不能当落点，取它现在的路径把这一项摘掉
        const subFolders = stripSelf(listing.folders, sessionRef.current?.path ?? '');

        cacheRef.current.set(path, subFolders);
        setView((prev) =>
          prev !== null && prev.path === path && prev.folders === null
            ? { folders: subFolders, path }
            : prev,
        );
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err, '读取不到这个文件夹的子文件夹'));
        }
      });

    return () => controller.abort();
  }, [cacheRef, folders, path, sessionRef, setError, setView]);
};
