/**
 * 目录工具栏的 props。
 */

/** 工具栏的入参 */
export type DirToolbarProps = {
  /** 当前目录绝对路径；空串表示还没选目录 */
  currentDir: string;
  /** 取数进行中（打开按钮随之禁用） */
  loading: boolean;
  /** 当前目录是否已收藏 */
  isFavorite: boolean;
  /** 还没选目录时收藏按钮禁用 */
  favoriteDisabled: boolean;
  /** 按输入框里的路径打开目录 */
  onOpenDir: (dir: string) => void;
  /** 调起系统目录选择器选择目录 */
  onPickDir: () => void;
  /** 收藏 / 取消收藏当前目录 */
  onToggleFavorite: () => void;
  /** 点面包屑某一段，回到该层目录 */
  onNavigate: (dir: string) => void;
};
