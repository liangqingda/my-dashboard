/**
 * 文件页业务弹窗的入参：删除条目、推出外接盘、卸载应用、改名、设为桌面墙纸。
 * 状态与动作都由页面层的 hook 持有，这里只把弹窗按顺序摆好。
 */

import type { DragMoveModalProps } from '../DragMoveModal/types';
import type { useAppUninstall } from '../hooks/useAppUninstall';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useEntryDelete } from '../hooks/useEntryDelete';
import type { useVolumeEject } from '../hooks/useVolumeEject';
import type { useWallpaper } from '../hooks/useWallpaper';
import type { FileEntry } from '../types';

/** 五扇弹窗的入参 */
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
  /** 设为桌面墙纸：待确认图片与请求状态（页面只传弹窗要用的四个字段） */
  wallpaper: Pick<
    ReturnType<typeof useWallpaper>,
    'cancel' | 'confirm' | 'loading' | 'request'
  >;
  /** 在当前目录新建文件夹（拖拽移动弹窗 header 那颗按钮） */
  onCreateFolder: (dir: string) => void;
  /** 用内置预览打开一张图片（拖拽移动弹窗待拖拽区的图标点一下就走这里） */
  onPreviewImage: (file: FileEntry) => void;
  /** 用内置预览打开一条视频：与点瓦片同一条路径，不看设置里的「外部应用」 */
  onPreviewVideo: (file: FileEntry) => void;
  /** 收藏：与列表页同一套（header 的收藏按钮、星标图标、快捷键与弹层都复用） */
  favorites: DragMoveModalProps['favorites'];
  /**
   * 在弹窗里选一个本地目录：返回选中的路径（取消返回 null）。
   * 只换弹窗那一层，不改列表页当前目录——与标题栏那颗按钮不是同一个动作。
   */
  onPickDir: DragMoveModalProps['onPickDir'];
};
