import type { FavoriteEntry } from '../../types';

/**
 * 收藏目录弹层面板的入参：当前目录收藏态、收藏列表与各事件都由按钮组层传入，
 * 面板只排布条目、固定按钮与拖拽排序。
 */
export type FavoritesPanelProps = {
  /** 收藏列表，已按「固定在前」排好 */
  favorites: FavoriteEntry[];
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 还没选目录时底部收藏按钮禁用 */
  disabled: boolean;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 直达某条收藏目录 */
  onOpen: (dir: string) => void;
  /** 移除一条收藏（固定项不显示这个入口） */
  onRemove: (path: string) => void;
  /** 切换一条收藏的固定状态 */
  onTogglePinned: (path: string) => void;
  /** 拖拽排序：把 from 挪到 to 之前 */
  onMove: (fromPath: string, toPath: string) => void;
  /** 直达后收起弹层 */
  onClose: () => void;
};
