import { useContext } from 'react';

import { DockContext } from '../context';
import type { DockContextValue } from '../types';

/** 需要程序坞能力的地方（弹窗、顶栏、布局）用它；没有 Provider 时直接报错，别默默吞掉 */
export const useDock = (): DockContextValue => {
  const value = useContext(DockContext);

  if (value === null) {
    throw new Error('程序坞未初始化：请把 DockProvider 挂到 App 层');
  }

  return value;
};

/** 弹窗里用：没有 Provider 时返回 null，弹窗按普通弹窗渲染（如单测里） */
export const useDockOptional = (): DockContextValue | null =>
  useContext(DockContext);
