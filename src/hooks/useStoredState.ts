import { useCallback, useState } from 'react';

import { readStoredString, writeStoredString } from '@/utils/local-storage';
import type { StoredCodec } from '@/utils/local-storage';

/**
 * 与 localStorage 同步的界面状态：初值读存储（经 codec 还原），每次变更写回，
 * 刷新页面重新进入后保持上次的展开 / 收起、全屏、视图形态。
 *
 * `key` 在组件生命周期内必须保持不变（换页面、换服务都是重新挂载），
 * 所以只在首次挂载读一次存储；之后以 state 为准，避免每次渲染都碰同步 I/O。
 */
export const useStoredState = <T>(key: string, codec: StoredCodec<T>) => {
  const [value, setValue] = useState<T>(() => codec.decode(readStoredString(key)));

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeStoredString(key, codec.encode(next));
    },
    [codec, key],
  );

  return [value, update] as const;
};
