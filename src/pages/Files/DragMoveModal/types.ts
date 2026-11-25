/**
 * 拖拽移动弹窗的 props：一次拖拽会话的全部状态与动作都在页面层的 `useDragMove` 里，
 * 这个组件只负责把「当前在哪一层、有哪些文件夹」呈现出来；
 * 新建文件夹、收藏、选目录与预览这些需要页面上下文的事，由页面给动作。
 */

import type { useDragMove } from '../hooks/use-drag-move';
import type { FavoriteEntry, FileEntry } from '../types';

/** 收藏面板在这一层要的那组数据与动作（与页面收藏面板同一套，作用对象是弹窗当前这一层） */
export type ModalFavorites = {
  /** 收藏列表，已按「固定在前」排好 */
  entries: FavoriteEntry[];
  /** 某个目录是否已收藏 */
  isFavorite: (path: string) => boolean;
  /** 拖拽排序：把 from 挪到 to 之前 */
  onMove: (fromPath: string, toPath: string) => void;
  /** 移除一条收藏 */
  onRemove: (path: string) => void;
  /** 收藏 / 取消收藏当前这一层 */
  onToggleFavorite: (path: string) => void;
  /** 切换一条收藏的固定状态 */
  onTogglePinned: (path: string) => void;
};

/** 弹窗入参 */
export type DragMoveModalProps = {
  /** 拖拽移动会话：包括弹窗开合、当前层、悬停 / 弹起态与各落点动作 */
  dragMove: ReturnType<typeof useDragMove>;
  /** 收藏：header 的收藏按钮与弹层跟列表页同一套（图标、快捷键、面板项都直达这一层） */
  favorites: ModalFavorites;
  /** 在当前这一层新建文件夹（与目录页标题栏那颗按钮同一套流程：建完直接改名） */
  onCreateFolder: (dir: string) => void;
  /** 用内置预览打开被拖的图片 / 视频（弹窗待拖拽区里那一行的图标点一下就走这里） */
  onPreview?: (file: FileEntry) => void;
  /**
   * 在弹窗里选一个本地目录：系统选择框以 `defaultDir` 打开，返回选中的路径（取消返回 null）。
   * 选完弹窗直接换到那一层——这一趟是给弹窗用的，不改变列表页当前目录。
   */
  onPickDir: (defaultDir: string) => Promise<string | null>;
};
