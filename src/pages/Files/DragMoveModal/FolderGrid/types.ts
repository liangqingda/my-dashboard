import type { MoveProgress } from '../../hooks/use-drag-move/types';
import type { DraggableEntry, FolderEntry } from '../../types';

/** 弹窗文件夹落点网格的入参：这一层有哪些子文件夹、谁在悬停 / 弹起，以及三个落点动作 */
export type FolderGridProps = {
  /** 这一层的子文件夹（已被会话过滤掉「被拖的那几个」） */
  folders: FolderEntry[];
  /** 手里 / 待拖拽区里的条目：判断某一格是不是「本来就全在里面」的禁用落点 */
  entries: DraggableEntry[];
  /** 拖拽进行中：只有这时才谈得上禁用落点与倒计时 */
  dragActive: boolean;
  /** 不在拖拽时：点一下就能进去 */
  idle: boolean;
  /** 点某一格进去 */
  onOpen: (path: string) => void;
  /** 在某一格松手：交给会话移进去（已在里面的那些由会话剔出来不搬） */
  onDrop: (path: string) => void;
  /**
   * 正在搬的进度：`targetDir` 命中哪一格，进度就画在那一格上
   * （与列表页直接拖进文件夹是同一套观感，弹窗里不再另起一扇进度窗）
   */
  progress: MoveProgress | null;
};
