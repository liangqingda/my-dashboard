import type { DraggableEntry, FileEntry } from '../../types';

/** 弹窗里待拖拽区的入参：一批条目平铺着，整批或单条都能拖起 */
export type HandCardProps = {
  /** 手里的条目：平铺成一行行，每条可单独拖，空白处整批拖 */
  entries: DraggableEntry[];
  /** 已经成为「待拖拽」（拖拽结束、条目回到手里） */
  handed: boolean;
  /** 拖起整批：由弹窗把拖拽状态重新点亮 */
  onDragStart: () => void;
  /** 拖起其中一条：弹窗把会话收窄到它再点亮拖拽态 */
  onDragEntry: (entry: DraggableEntry) => void;
  /** 拖拽结束（松手 / Esc） */
  onDragEnd: () => void;
  /** 用内置预览打开被拖的图片 / 视频（单项且可预览时才有入口） */
  onPreview?: (file: FileEntry) => void;
};
