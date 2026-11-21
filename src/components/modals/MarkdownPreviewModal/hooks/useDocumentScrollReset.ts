/**
 * 换文档 / 重新打开弹窗时把正文滚回顶部。
 *
 * 弹窗不再按篇重挂（重挂会把全屏状态一起重置，表现为切上一篇 / 下一篇就掉出全屏），
 * 所以滚动位置要自己复位：否则上一篇读到一半的位置会留在下一篇上。
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * 文档身份（标题）或打开状态变化时，把正文容器滚回顶部。
 *
 * @param container 正文容器的 ref（它同时也是滚动容器）
 * @param documentKey 文档身份，变了就是换了一篇
 * @param opened 弹窗是否打开；关着时不做无意义滚动
 */
export const useDocumentScrollReset = (
  container: RefObject<HTMLElement | null>,
  documentKey: string,
  opened: boolean,
): void => {
  useEffect(() => {
    if (!opened) {
      return;
    }

    container.current?.scrollTo({ top: 0 });
  }, [container, documentKey, opened]);
};
