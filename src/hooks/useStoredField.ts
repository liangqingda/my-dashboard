import { useCallback, useState } from 'react';

import { readStoredField, writeStoredField } from '@/utils/local-storage';
import type { StoredFieldCodec } from '@/utils/local-storage';

/**
 * 与 localStorage 里某个对象字段同步的界面状态：一个弹窗的整组偏好存在一个命名空间对象里，
 * 每个字段各由一个 hook 持有（全屏、字号、目录宽度…），写回时只动自己那一项。
 *
 * `key` / `field` 在组件生命周期内必须保持不变（换弹窗、换页面都是重新挂载），
 * 所以只在首次挂载读一次存储；之后以 state 为准，避免每次渲染都碰同步 I/O。
 *
 * 写回是读-改-写：先读存储里的整组再合并这一项，同命名空间的其它字段不会被冲掉。
 * 不跨标签页回读，理由与 `@/hooks/useStoredState` 相同（见 `@/utils/local-storage` 的说明）。
 */
export const useStoredField = <T>(
  key: string,
  field: string,
  codec: StoredFieldCodec<T>,
) => {
  const [value, setValue] = useState<T>(() =>
    readStoredField(key, field, codec),
  );

  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeStoredField(key, field, codec, next);
    },
    [codec, field, key],
  );

  return [value, update] as const;
};
