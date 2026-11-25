import type { DraggableEntry, FileEntry } from '../../types';

/** 弹窗里待拖拽区的入参：一批条目平铺着，整批或单条都能拖起 */
export type HandCardProps = {
  /** 手里的条目（按整批的原顺序平铺）：每条可单独拖，空白处整批拖 */
  entries: DraggableEntry[];
  /**
   * 正被单条拖着的那一条路径：它在网格里留一个虚位，
   * 其余条目位置不动，看得出「它从这一格拿起来、松手还回这一格」。
   */
  focusPath?: string | null;
  /**
   * 整批都被拖起来（不是某一条）：所有条目都画成虚态实物——位子与内容都在，
   * 只是压暗成「正被搬走」的样子，别让它们从待拖拽区里凭空消失。
   */
  ghostAll?: boolean;
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
