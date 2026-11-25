/**
 * 文件页展示形式：网格瓦片 ⇄ 表格平铺。
 *
 * 用户手动切换的展示偏好记在 localStorage，刷新页面重新进入后保持上次的形态；
 * 两种形态读的是同一份目录结果，切视图只决定渲染哪一份，不重新取数。
 */

import { useStoredState } from '@/hooks/useStoredState';

import { VIEW_MODE_CODEC, VIEW_MODE_STORAGE_KEY } from '../constants';
import type { UseFilesViewModeResult } from '../types';

export const useFilesViewMode = (): UseFilesViewModeResult => {
  const [view, setView] = useStoredState(VIEW_MODE_STORAGE_KEY, VIEW_MODE_CODEC);

  return { isGridView: view === 'grid', setView, view };
};
