/**
 * 点开一颗要等正文的图标：图标先转圈交代「点了、在等数据」，窗等正文就位再从它那里长出来。
 * 只活一趟开窗——宿主开始跑几何动画、或窗被收掉，就清空。
 */

import { useCallback, useState } from 'react';

export const useDockPreparing = () => {
  const [preparingId, setPreparingId] = useState<string | null>(null);

  /** 传条目 id 开始转圈，传 `null` 收工 */
  const markPreparing = useCallback((id: string | null) => {
    setPreparingId(id);
  }, []);

  return { markPreparing, preparingId };
};
