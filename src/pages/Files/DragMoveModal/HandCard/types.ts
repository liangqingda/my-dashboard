import type { DraggableEntry, FileEntry } from '../../types';

/** 手持卡片的入参 */
export type HandCardProps = {
  /** 手里这批条目：一项或多项，图标按类型取、最多叠三层 */
  entries: DraggableEntry[];
  /** 已经成为「待拖拽」（拖拽结束、条目回到手里） */
  handed: boolean;
  /** 拖起这批条目：由弹窗把拖拽状态重新点亮 */
  onDragStart: () => void;
  /** 拖拽结束（松手 / Esc） */
  onDragEnd: () => void;
  /** 用内置预览打开被拖的图片 / 视频（仅单项且可预览时有入口） */
  onPreview?: (file: FileEntry) => void;
};
