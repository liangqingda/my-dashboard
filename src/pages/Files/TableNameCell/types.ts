/**
 * 表格名称单元格的 props。
 */

import type { AppEntry, FileEntry, FilesRow } from '../types';

/** 表格一行名称列的入参：图标 + 名称，按条目类型决定整块可否点击 */
export type TableNameCellProps = {
  /** 这一行的条目 */
  row: FilesRow;
  /** 正在切目录取数：文件夹名称后挂进度 spinner */
  listLoading: boolean;
  /** 正在打开的文件夹路径；null 表示没有打开请求在跑 */
  loadingFolder: string | null;
  /** 正在启动的应用路径；null 表示没有启动请求在跑 */
  launchingApp: string | null;
  /** 拖拽进行中：文件名不弹 hover 提示 */
  tipsOff: boolean;
  /** 打开某个子文件夹 */
  onOpenFolder: (dir: string) => void;
  /** 点应用名称交给系统打开该应用 */
  onOpenApp: (app: AppEntry) => void;
  /** 打开某条视频（交给视频预览弹窗） */
  onOpenVideo: (file: FileEntry) => void;
  /** 打开某张图片（交给图片预览弹窗） */
  onOpenImage: (file: FileEntry) => void;
};
