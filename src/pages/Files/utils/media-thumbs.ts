/**
 * 网格瓦片的图源：图片与视频用内容侧缩略图（`/thumb`），外部打开模式下视频改用
 * 所选播放器的应用图标（`/app-icon?app=`）。都是 URL 拼接，取不到由 `<img>` 的
 * 加载失败回落分类图标，不在前端兜底。
 */

/** 缩略图：图片缩放后的 JPEG、视频 QuickLook 抽的一帧 PNG，服务端按路径缓存 */
export const fileThumbUrl = (path: string): string =>
  `/api/files/thumb?path=${encodeURIComponent(path)}`;

/** 播放器图标：没选应用（`undefined`）或空串时后端回落默认播放器（IINA） */
export const videoAppIconUrl = (app?: string): string =>
  `/api/files/app-icon?app=${encodeURIComponent(app ?? '')}`;
