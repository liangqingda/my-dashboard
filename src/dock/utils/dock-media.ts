/**
 * 坞窗媒体条目的渲染补全：快照里只存路径，名称、取图地址与视频封面都在这里按路径推导。
 * 拼法与文件页预览、网格缩略图同一套（`files-api` / `media-thumbs`），
 * 所以恢复出来的窗和页面里看到的是同一张图、同一条视频，而不是另存一份 URL。
 */

import type { ImagePreviewItem } from '@/components/modals/ImagePreviewModal/types';
import type { VideoPreviewItem } from '@/components/modals/VideoPreviewModal/types';

import { baseNameOfPath } from '@/pages/Files/utils/files';
import { imageContentUrl, videoContentUrl } from '@/pages/Files/utils/files-api';
import { fileThumbUrl } from '@/pages/Files/utils/media-thumbs';

import type { MediaDockItem } from '../types';

/** 图片条目：路径补成「id + 名称 + 预览地址」 */
export const toDockImageItems = (
  items: readonly MediaDockItem[],
): ImagePreviewItem[] =>
  items.map((item) => ({
    id: item.id,
    name: baseNameOfPath(item.id),
    src: imageContentUrl(item.id),
  }));

/** 视频条目：再多一张封面（网格已经取过同一地址，走缓存几乎不额外发请求） */
export const toDockVideoItems = (
  items: readonly MediaDockItem[],
): VideoPreviewItem[] =>
  items.map((item) => ({
    id: item.id,
    name: baseNameOfPath(item.id),
    poster: fileThumbUrl(item.id),
    src: videoContentUrl(item.id),
  }));
