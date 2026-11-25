/**
 * 拖拽层（待拖拽区 + 跟随指针的拖拽影像 + 飞入动画）的入参：
 * 两套状态都由页面持有，这里只负责接线。
 */

import type { useDragPending } from '../hooks/use-drag-pending';
import type { useEntryActions } from '../hooks/useEntryActions';

/** 拖拽层的入参 */
export type FilesDragLayersProps = {
  /** 待拖拽区状态：攒了哪些条目、正往这儿拖的那一程、移除 / 清空 */
  pending: ReturnType<typeof useDragPending>;
  /** 条目动作编排：起拖入口与移动会话（会话里有「正在拖哪一批」） */
  entryActions: ReturnType<typeof useEntryActions>;
  /** 从列表拖过来的条目在待拖拽区松手：按路径收进来（页面按当前列表把这些路径认成条目） */
  onDropPaths: (paths: string[]) => void;
};
