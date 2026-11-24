/**
 * 目录网格的 props。
 */

import type { DragEvent } from 'react';

import type {
  AppEntry,
  FileEntry,
  FolderEntry,
  VideoOpenMode,
  VideoThumbStyle,
} from '../types';

/** 网格的入参 */
export type DirectoryGridProps = {
  /** 子文件夹 */
  folders: FolderEntry[];
  /** 直属应用包（已按显示名排序） */
  apps: AppEntry[];
  /** 直属文件（已按名称排序） */
  files: FileEntry[];
  /** 列表正在取数：只有取数期间才给对应文件夹瓦片挂进度 */
  loading: boolean;
  /** 正在打开的文件夹路径；null 表示没有打开请求在跑 */
  loadingFolder: string | null;
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 设置里的播放器应用名：视频瓦片在外部模式下摆它的图标 */
  videoApp: string;
  /** 外部打开时瓦片大图摆视频帧还是播放器图标 */
  videoThumbStyle: VideoThumbStyle;
  /** 视频点击后去哪：决定视频瓦片是摆播放器图标还是摆视频帧 */
  videoOpenMode: VideoOpenMode;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频（交给视频预览弹窗） */
  onOpenVideo: (file: FileEntry) => void;
  /** 打开某张图片（交给图片预览弹窗） */
  onOpenImage: (file: FileEntry) => void;
  /** 开始拖拽一条目 */
  onDragStartEntry: (path: string) => void;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽经过某文件夹（网格与表格共用同一套移动口径） */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目（弹窗改名） */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 点应用瓦片：交给系统打开这个应用 */
  onOpenApp: (app: AppEntry) => void;
  /** 正在启动的应用路径；null 表示没有启动请求在跑 */
  launchingApp: string | null;
  /** 请求卸载某个应用（先弹二次确认并列出残留） */
  onRequestUninstallApp: (app: AppEntry) => void;
  /** 请求删除某个条目（先弹二次确认） */
  onRequestDeleteEntry: (path: string) => void;
};
