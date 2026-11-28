/**
 * 列表区的 props：数据由页面筛好，事件全部是页面 / hook 里已有的回调，这里只负责排布。
 */

import type { DragEvent } from 'react';

import type { MoveProgress } from '../hooks/use-drag-move/types';
import type {
  AppEntry,
  DraggableEntry,
  EntryGroupKey,
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
  /** 正在被拖走的条目路径（直接拖模式下可能是一批） */
  dragPaths: string[];
  /** 这个目录一条都没有时的说明文案；null 表示有内容 */
  emptyText: string | null;
  /** 直接拖模式下正在搬家：落在哪个文件夹、搬到第几条（画在目标文件夹上，不进进度弹窗） */
  folderProgress: MoveProgress | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /**
   * 直接拖模式下的禁用落点：这一格文件夹在待拖拽区里，不能把东西拖进去；
   * null 表示没有禁用中的格子（弹窗模式永远是 null）
   */
  dropBlockedPath: string | null;
  /** 筛完的文件 */
  files: FileEntry[];
  /** 筛完的子文件夹 */
  folders: FolderEntry[];
  /** 网格 / 表格 */
  isGridView: boolean;
  /** 列表是否按类型分组成段展示 */
  grouped: boolean;
  /** 已收起的分组键集合；空集表示全部展开 */
  collapsedGroups: ReadonlySet<EntryGroupKey>;
  /** 切换某一组的展开 / 收起 */
  onToggleGroup: (key: EntryGroupKey) => void;
  /** 正在切目录取数：整块列表蒙一层 loading */
  loading: boolean;
  /** 正在打开的文件夹路径：该瓦片 / 行显示进度 */
  loadingFolder: string | null;
  /** 表格视图的行（文件夹 → 应用 → 文件） */
  rows: FilesRow[];
  /** 待拖拽区里已攒的条目路径：网格据此画选中框 */
  pendingPaths: string[];
  /** 待拖拽区非空：网格里点条目变成加入 / 移除 */
  pendingActive: boolean;
  /** 把某条目加入 / 移出待拖拽区；`from` 是瓦片矩形，加入时用来播飞入动画 */
  onTogglePending: (entry: FolderEntry | FileEntry, from: DOMRect) => void;
  /** `Shift` + 点击的连选（网格 / 表格各自按自己的显示顺序拼 `ordered`） */
  onSelectRange: (ordered: DraggableEntry[], path: string) => void;
  /** 拖拽进行中：文件名不弹 hover 提示（表格与网格同口径） */
  tipsOff: boolean;
  /** 应用目录用定宽列：文件夹与应用同尺寸、不随屏幕拉伸 */
  fixedColumns: boolean;
  /** 网格瓦片宽度（px）：设置面板里调，网格按它固定折列 */
  tileWidth: number;
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
  onDragStartEntry: (entry: FolderEntry | FileEntry) => void;
  /** 松手放入某文件夹 */
  /** 松手落在列表空白处（直接拖模式＝搬进当前这一层）；undefined 表示这一模式不接 */
  onDropBlank?: () => void;
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
  /** 请求把某张图片设为桌面墙纸（先弹二次确认；列表与表格共用同一颗按钮） */
  onSetWallpaper: (file: FileEntry) => void;
  /** 把某条媒体直接收进程序坞（网格瓦片 hover 时的按钮） */
  onMinimizeFileToDock: (file: FileEntry, sourceEl: HTMLElement | null) => void;
  /** 请求卸载某个应用 */
  onRequestUninstallApp: (app: AppEntry) => void;
};
