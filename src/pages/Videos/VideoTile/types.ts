/**
 * 视频瓦片的 props。
 */

import type { VideoFileEntry } from '../types';

/** 网格里一条视频文件的入参 */
export type VideoTileProps = {
  /** 视频文件摘要 */
  video: VideoFileEntry;
};
