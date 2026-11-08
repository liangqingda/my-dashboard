/**
 * 判断元素里的单行文本是否被省略号截断：滚动宽度大于可视宽度即为截断。
 *
 * 用于「只有真被截断时才弹 tip」的场景，避免给本来完整显示的标题白挂一个提示。
 */

import { useLayoutEffect, useRef, useState } from 'react';

const useIsTruncated = <T extends HTMLElement>(text: string) => {
  const ref = useRef<T | null>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    /** 两个宽度都是含内边距的盒子宽度，比较口径一致；留 1px 抹平亚像素取整 */
    const measure = () => {
      setTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    measure();

    /** 导航宽度会随媒体查询 / 窗口变化，元素一变形就重量一次 */
    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [text]);

  return { ref, truncated };
};

export default useIsTruncated;
