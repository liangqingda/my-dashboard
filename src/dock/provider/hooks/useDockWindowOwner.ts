/**
 * 这扇坞窗挂在哪颗图标上：开窗时是打开它的那一条，窗内翻到程序坞里另一条时改挂到那一条，
 * 翻到程序坞外的内容不改挂。收录动作、X 删哪条、图标激活与 `←` / `→` 的格位都按它。
 */

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { DockEntry } from '../../types';

export const useDockWindowOwner = (entriesRef: MutableRefObject<DockEntry[]>) => {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const ownerRef = useRef<string | null>(ownerId);

  const writeOwner = useCallback((id: string | null) => {
    ownerRef.current = id;
    setOwnerId(id);
  }, []);

  /** 窗上报「现在显示哪一条」：那条在程序坞里就改挂到它，翻到程序坞外则保持不动 */
  const adoptOwner = useCallback(
    (id: string | null) => {
      if (
        id === null ||
        ownerRef.current === id ||
        !entriesRef.current.some((entry) => entry.id === id)
      ) {
        return;
      }

      writeOwner(id);
    },
    [entriesRef, writeOwner],
  );

  return { adoptOwner, ownerId, ownerRef, writeOwner };
};
