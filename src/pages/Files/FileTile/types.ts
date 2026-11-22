/**
 * 文件瓦片的 props。
 */

import type { FileEntry } from '../types';

/** 网格里一条文件的入参 */
export type FileTileProps = {
  /** 文件摘要 */
  file: FileEntry;
};
