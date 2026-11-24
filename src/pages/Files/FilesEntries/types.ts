/**
 * 列表区的 props：数据由页面筛好，事件全部是页面 / hook 里已有的回调，这里只负责排布。
 */

import type { DragEvent } from 'react';

import type {
  AppEntry,
  FileEntry,
  FilesRow,
  FolderEntry,
  VideoOpenMode,
  VideoThumbStyle,
} from '../types';

/** 列表区入参：网格与表格共用同一套数据与事件 */
export type FilesEntriesProps = {
  /** 筛完的应用包 */
  apps: AppEntry[];
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 筛完的文件 */
  files: FileEntry[];
  /** 筛完的子文件夹 */
  folders: FolderEntry[];
  /** 网格 / 表格 */
  isGridView: boolean;
  /** 正在切目录取数：整块列表蒙一层 loading */
  loading: boolean;
  /** 正在打开的文件夹路径：该瓦片 / 行显示进度 */
  loadingFolder: string | null;
  /** 表格视图的行（文件夹 → 应用 → 文件） */
  rows: FilesRow[];
  /** hover 玻璃层透明度（0–100） */
  veilOpacity: number;
  /** 设置里的播放器应用名：网格在外部模式下用它的图标 */
  videoApp: string;
  /** 外部打开时瓦片大图摆视频帧还是播放器图标 */
  videoThumbStyle: VideoThumbStyle;
  /** 视频点击后去哪：网格据此决定视频瓦片摆播放器图标还是视频帧 */
  videoOpenMode: VideoOpenMode;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 拖拽经过某文件夹 */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 开始拖拽一条目：路径用于移动，名字用于移动弹窗标题 */
  onDragStartEntry: (path: string, name: string, kind: 'folder' | 'file') => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目 */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 正在启动的应用路径 */
  launchingApp: string | null;
  /** 点应用瓦片打开该应用 */
  onOpenApp: (app: AppEntry) => void;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频 */
  onOpenVideo: (file: FileEntry) => void;
  /** 用外部播放器打开某个视频（瓦片上那枚播放器小图标） */
  onOpenExternalVideo: (path: string) => void;
  /** 打开某张图片 */
  onOpenImage: (file: FileEntry) => void;
  /** 请求删除某个条目 */
  onRequestDeleteEntry: (path: string) => void;
  /** 请求卸载某个应用 */
  onRequestUninstallApp: (app: AppEntry) => void;
};
