/**
 * 文件页四扇业务弹窗的入参：删除条目、推出外接盘、卸载应用、改名。
 * 状态与动作都由页面层的 hook 持有，这里只把弹窗按顺序摆好。
 */

import type { useAppUninstall } from '../hooks/useAppUninstall';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useEntryDelete } from '../hooks/useEntryDelete';
import type { useVolumeEject } from '../hooks/useVolumeEject';
import type { FileEntry } from '../types';

/** 四扇弹窗的入参 */
export type FilesModalsProps = {
  /** 应用卸载：待卸载应用与残留报告 */
  appUninstall: ReturnType<typeof useAppUninstall>;
  /** 删除条目：待删除项与请求状态（页面只传弹窗要用的四个字段） */
  deleteState: Pick<
    ReturnType<typeof useEntryDelete>,
    'cancelDelete' | 'confirmDelete' | 'deleteLoading' | 'deletingEntry'
  >;
  /** 改名 / 新建文件夹：待改名条目与提交动作 */
  entryActions: ReturnType<typeof useEntryActions>;
  /** 推出外接盘：待确认卷与请求状态 */
  volumeEject: ReturnType<typeof useVolumeEject>;
  /** 在当前目录新建文件夹（拖拽移动弹窗 header 那颗按钮） */
  onCreateFolder: (dir: string) => void;
  /** 用内置预览打开一张图片（拖拽移动弹窗待拖拽区的图标点一下就走这里） */
  onPreviewImage: (file: FileEntry) => void;
  /** 用内置预览打开一条视频：与点瓦片同一条路径，不看设置里的「外部应用」 */
  onPreviewVideo: (file: FileEntry) => void;
  /** 某个目录是否已收藏（拖拽移动弹窗 header 的收藏按钮） */
  isFavorite: (path: string) => boolean;
  /** 收藏 / 取消收藏某个目录（名字由路径末段推出） */
  onToggleFavorite: (path: string) => void;
  /** 选择本地目录（与标题栏那颗按钮同一套流程） */
  onPickDir: () => void;
};
