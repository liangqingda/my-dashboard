/**
 * 文本是否被省略号截断：只给一个 ref 和一次性的测量，**不自动量**。
 *
 * 刻意不在挂载时量、也不挂 ResizeObserver：页面上几百个条目各自量一次，等于把
 * 一次布局拆成几百次强制重排；「有没有被截断」只对被指到的那一条有意义，所以测量
 * 推迟到悬停 / 聚焦那一刻，成本只付一次（一次只量一个元素）。
 *
 * 单行按宽度判断，两行按高度判断；返回的是 callback ref 而不是对象 ref，所以同一套
 * 逻辑既能量 button 也能量 span；同时把目标元素交给 `targetRef`，供「挂在旁边、指向它」
 * 的 tip 定位用。
 */

import { useCallback, useRef } from 'react';

/** 留 1px 抹平亚像素取整，避免刚好贴合时误判成截断 */
const TRUNCATION_SLACK = 1;

type MeasureKind = 'width' | 'height';

const useIsTruncated = () => {
  const targetRef = useRef<HTMLElement | null>(null);

  /** 换元素照旧能量；React 卸载时会以 null 回调，顺手清掉引用 */
  const ref = useCallback((node: HTMLElement | null) => {
    targetRef.current = node;
  }, []);

  /**
   * 量一次并返回结果：`width` 滚动宽度大于盒子宽度即为横向截断；
   * `height` 滚动高度大于盒子高度即为纵向截断。
   * 两个口径都是含内边距的盒子尺寸；元素没挂上（还在隐藏的视图里）按没截断处理。
   */
  const measure = useCallback(
    (kind: MeasureKind = 'width'): boolean => {
      const element = targetRef.current;

      if (element === null) {
        return false;
      }

      if (kind === 'height') {
        return element.scrollHeight > element.clientHeight + TRUNCATION_SLACK;
      }

      return element.scrollWidth > element.clientWidth + TRUNCATION_SLACK;
    },
    [],
  );

  return { measure, ref, targetRef };
};

export default useIsTruncated;
