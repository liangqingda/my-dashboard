/**
 * 文件瓦片的 props。
 */

import type { FileEntry, VideoOpenMode, VideoThumbStyle } from '../types';

/** 网格里一条文件的入参 */
export type FileTileProps = {
  /** 文件摘要 */
  file: FileEntry;
  /** 当前正在被拖拽 */
  dragging?: boolean;
  /** 已在待拖拽区里：画一圈选中框，再点一下是移除 */
  pending?: boolean;
  /** 待拖拽模式：hover 不再浮出重命名 / 删除 */
  hideActions?: boolean;
  /** 拖拽进行中：文件名不弹 hover 提示（提示会挡在拖拽物上） */
  tipOff?: boolean;
  /** 开始拖拽本条 */
  onDragStartEntry?: () => void;
  /** 拖拽结束（松开 / 取消） */
  onDragEnd?: () => void;
  /** 打开这个文件（视频 / 图片会传，交给对应预览弹窗） */
  onOpen?: () => void;
  /** 用外部播放器打开这个视频（体积旁的小播放器图标点一下就走这里） */
  onOpenExternal?: (path: string) => void;
  /** 重命名这个文件 */
  onEdit?: () => void;
  /** 请求删除这个文件（先弹二次确认） */
  onRequestDelete?: () => void;
  /** hover 玻璃层透明度（0–100），页面设置里的滑块；缺省按 100 处理 */
  veilOpacity?: number;
  /** 设置里选的播放器应用名：视频改用外部应用打开时，图标随它变 */
  videoApp?: string;
  /** 视频点击后去哪：`external` 时按 `videoThumbStyle` 摆图，`preview` 时摆视频帧 */
  videoOpenMode?: VideoOpenMode;
  /** 外部打开时大图摆视频帧还是播放器图标 */
  videoThumbStyle?: VideoThumbStyle;
};
