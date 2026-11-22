/**
 * 文件夹瓦片的 props。
 */

import type { FolderEntry } from '../types';

/** 网格里一条子文件夹的入参 */
export type FolderTileProps = {
  /** 文件夹摘要 */
  folder: FolderEntry;
  /** 打开这个文件夹 */
  onOpen: (path: string) => void;
};
