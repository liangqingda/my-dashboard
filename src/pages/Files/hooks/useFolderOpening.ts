import { useState } from 'react';

/**
 * 文件夹的「正在打开」状态：点文件夹时记下目标路径并立即切目录，
 * 页面把该路径配合 loading 交给瓦片 / 表格行显示进度，取数结束进度自然消失。
 */
export const useFolderOpening = (openDir: (dir: string) => void) => {
  const [openingFolder, setOpeningFolder] = useState<string | null>(null);

  const openFolder = (dir: string) => {
    setOpeningFolder(dir);
    openDir(dir);
  };

  return { openFolder, openingFolder };
};
