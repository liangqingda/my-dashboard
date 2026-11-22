/**
 * 文件瓦片的 props。
 */

import type { FileEntry } from '../types';

/** 网格里一条文件的入参 */
export type FileTileProps = {
  /** 文件摘要 */
  file: FileEntry;
  /** 当前正在被拖拽 */
  dragging?: boolean;
  /** 开始拖拽本条 */
  onDragStartEntry?: () => void;
  /** 拖拽结束（松开 / 取消） */
  onDragEnd?: () => void;
  /** 打开这个文件（目前只有视频会传，交给视频预览弹窗） */
  onOpen?: () => void;
  /** 重命名这个文件 */
  onEdit?: () => void;
  /** 请求删除这个文件（先弹二次确认） */
  onRequestDelete?: () => void;
};
