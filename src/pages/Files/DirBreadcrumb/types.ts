/**
 * 目录面包屑的 props。
 */

/** 面包屑的入参 */
export type DirBreadcrumbProps = {
  /** 当前目录绝对路径；空串表示还没选目录 */
  currentDir: string;
  /** 点面包屑某一段，回到该层目录 */
  onNavigate: (dir: string) => void;
};
