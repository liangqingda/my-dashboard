import { useFolderOpening } from './useFolderOpening';

/** 目录导航需要的入参：切目录前要清掉的那几组临时状态由页面列出来 */
export type FilesNavigationParams = {
  /** 切到指定目录（页面级取数入口） */
  openDir: (dir: string) => void;
  /** 调起系统目录选择框 */
  pickDir: () => void;
  /** 离开当前目录前要重置的状态：改名、拖拽、待删除、待卸载、两扇预览 */
  resetTransientFns: readonly (() => void)[];
  /** 当前目录的父目录；已在文件系统根时为 null */
  parentDir: string | null;
};

/**
 * 文件页的目录导航：切目录前统一清掉临时状态，把「点文件夹出进度」「选目录」这几个入口
 * 收在一处，页面只接回调，不再各写一份清理顺序。
 */
export const useFilesNavigation = ({
  openDir,
  parentDir,
  pickDir,
  resetTransientFns,
}: FilesNavigationParams) => {
  const resetTransientState = () => {
    for (const reset of resetTransientFns) {
      reset();
    }
  };

  const goToDir = (dir: string) => {
    resetTransientState();
    openDir(dir);
  };

  const { openFolder, openingFolder } = useFolderOpening(goToDir);
  /** 已是文件系统根时没有上级目录，快捷键不动作 */
  const navigateParent =
    parentDir !== null ? () => goToDir(parentDir) : undefined;

  const handlePickDir = () => {
    resetTransientState();
    pickDir();
  };

  return { goToDir, handlePickDir, navigateParent, openFolder, openingFolder };
};
