import type { FavoriteEntry } from '../../types';

/**
 * 收藏目录弹层面板的入参：当前目录收藏态、收藏列表与各事件都由按钮组层传入，
 * 面板只排布顶部操作按钮与条目列表。
 */
export type FavoritesPanelProps = {
  /** 已收藏的目录列表 */
  favorites: FavoriteEntry[];
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 还没选目录时顶部收藏按钮禁用 */
  disabled: boolean;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 直达某条收藏目录 */
  onOpen: (dir: string) => void;
  /** 移除一条收藏 */
  onRemove: (path: string) => void;
  /** 直达后收起弹层 */
  onClose: () => void;
};
