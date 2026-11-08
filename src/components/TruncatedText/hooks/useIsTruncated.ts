/**
 * 判断元素里的单行文本是否被省略号截断：滚动宽度大于可视宽度即为截断。
 *
 * 用于「只有真被截断时才弹 tip」的场景，避免给本来完整显示的文本白挂一个提示。
 * 返回的是 callback ref 而不是对象 ref，所以同一套逻辑既能量 button 也能量 span。
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const useIsTruncated = (text: string) => {
  const [truncated, setTruncated] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    /** 两个宽度都是含内边距的盒子宽度，口径一致；留 1px 抹平亚像素取整 */
    setTruncated(element.scrollWidth > element.clientWidth + 1);
  }, []);

  /** 换元素照旧能量宽；卸载时 React 会以 null 回调，顺手断开 observer */
  const ref = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elementRef.current = node;

      if (!node) {
        return;
      }

      measure();

      /** 容器宽度会随窗口 / 媒体查询变化，元素一变形就重量一次 */
      const observer = new ResizeObserver(measure);

      observer.observe(node);
      observerRef.current = observer;
    },
    [measure],
  );

  /** 文本变了但元素尺寸没变时 resize 不会触发（比如同一位置换了一篇标题） */
  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  return { ref, truncated };
};

export default useIsTruncated;
