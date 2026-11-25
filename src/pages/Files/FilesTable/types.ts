/**
 * 表格平铺视图的 props。
 */

import type { DragEvent } from 'react';

import type {
  AppEntry,
  EntryGroupKey,
  FileEntry,
  FilesRow,
  FolderEntry,
} from '../types';

/** 表格的入参：数据与事件都与网格一致，只是换一种排布 */
export type FilesTableProps = {
  /** 筛选后的行：文件夹在前、应用其次、文件在后（见 `toFilesRows`） */
  rows: FilesRow[];
  /** 列表是否按类型分组成段展示 */
  grouped: boolean;
  /** 已收起的分组键集合；空集表示全部展开 */
  collapsedGroups: ReadonlySet<EntryGroupKey>;
  /** 切换某一组的展开 / 收起 */
  onToggleGroup: (key: EntryGroupKey) => void;
  /** 当前拖拽源条目路径；null 表示没在拖拽 */
  dragSource: string | null;
  /** 当前悬停的放置目标文件夹路径；null 表示没有目标 */
  dropTarget: string | null;
  /** 列表正在取数：只有取数期间才给对应文件夹行挂进度 */
  listLoading: boolean;
  /** 正在打开的文件夹路径：该行名称后显示进度且整行暂不可点 */
  loadingFolder: string | null;
  /** 正在启动的应用路径 */
  launchingApp: string | null;
  /** 点应用名称交给系统打开该应用 */
  onOpenApp: (app: AppEntry) => void;
  /** 打开某个子文件夹（点名称进入下一层） */
  onOpenFolder: (dir: string) => void;
  /** 打开某条视频（点名称交给视频预览弹窗） */
  onOpenVideo: (file: FileEntry) => void;
  /** 打开某张图片（点名称交给图片预览弹窗） */
  onOpenImage: (file: FileEntry) => void;
  /** 开始拖拽一条目：路径用于移动，名字用于移动弹窗标题 */
  onDragStartEntry: (entry: FolderEntry | FileEntry) => void;
  /** 拖拽结束 */
  onDragEnd: () => void;
  /** 拖拽经过某文件夹 */
  onDragOverFolder: (path: string, event: DragEvent<HTMLElement>) => void;
  /** 拖拽离开某文件夹 */
  onDragLeaveFolder: (path: string) => void;
  /** 松手放入某文件夹 */
  onDropFolder: (path: string) => void;
  /** 重命名某个条目（弹窗改名） */
  onEditEntry: (entry: FolderEntry | FileEntry) => void;
  /** 请求卸载某个应用（先弹二次确认并列出残留） */
  onRequestUninstallApp: (app: AppEntry) => void;
  /** 请求删除某个条目（先弹二次确认） */
  onRequestDeleteEntry: (path: string) => void;
  /** 拖拽进行中：名称一律不弹 hover 提示（提示会挡在拖拽物上） */
  tipsOff: boolean;
  /** 待拖拽区非空：点条目变成加入 / 移除，不再打开 */
  pendingActive: boolean;
  /** 已在待拖拽区里的路径：行上给选中态 */
  pendingPaths: string[];
  /** 点条目加入 / 移出待拖拽区（起点矩形给飞入动画用） */
  onTogglePending: (entry: FileEntry | FolderEntry, from: DOMRect) => void;
};
