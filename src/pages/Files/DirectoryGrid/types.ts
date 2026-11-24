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
  /**
   * 待拖拽区里已有的路径：这些瓦片画选中框，再点一下是移除。
   * 应用包不参与（不进待拖拽区、也不能拖）。
   */
  pendingPaths: string[];
  /** 待拖拽区非空：此时点条目是「加入 / 移除」，不再打开 */
  pendingActive: boolean;
  /** 把某条目加入 / 移出待拖拽区（点击语义，含 ⌘ / Shift + 点击） */
  onTogglePending: (entry: FolderEntry | FileEntry) => void;
  /** 拖拽进行中：文件名一律不弹 hover 提示 */
  tipsOff: boolean;
  /** 应用目录（`/Applications` 这类）用定宽列，文件夹与应用同尺寸、不随屏幕拉伸 */
  fixedColumns: boolean;
  /** hover 玻璃层透明度（0–100） */
  veilOpacity: number;
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
  /** 用外部播放器打开某个视频（瓦片上那枚播放器小图标） */
  onOpenExternalVideo: (path: string) => void;
  /** 打开某张图片（交给图片预览弹窗） */
  onOpenImage: (file: FileEntry) => void;
  /** 开始拖拽一条目：路径用于移动，名字用于移动弹窗标题 */
  onDragStartEntry: (entry: FolderEntry | FileEntry) => void;
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
