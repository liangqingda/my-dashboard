/**
 * 文件页的两层浮层：业务弹窗与预览层。
 * 入参给的是页面持有的 hook 与少量派生值，扁平 props 在这一层内部拼好——
 * 页面正文里不该出现几十行「把字段一个个传下去」。
 * 拖拽层不在这里：待拖拽区要跟列表排在内容区那一行里（`FilesWorkspace`），页面不经过这一层。
 */

import type { useAppUninstall } from '../hooks/useAppUninstall';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useEntryDelete } from '../hooks/useEntryDelete';
import type { useFavorites } from '../hooks/useFavorites';
import type { useImagePreview } from '../hooks/useImagePreview';
import type { useVideoPreview } from '../hooks/useVideoPreview';
import type { useVolumeEject } from '../hooks/useVolumeEject';
import type { useWallpaper } from '../hooks/useWallpaper';
import type { FileEntry } from '../types';

/** 两层浮层的入参 */
export type FilesOverlaysProps = {
  /** 业务弹窗：删除 / 改名 / 卸载 / 推出外接盘 / 设为桌面墙纸 / 拖拽移动 */
  modals: {
    appUninstall: ReturnType<typeof useAppUninstall>;
    /** 删除条目：弹窗只要其中四个字段，由本层挑 */
    deleteEntry: ReturnType<typeof useEntryDelete>;
    entryActions: ReturnType<typeof useEntryActions>;
    favorites: ReturnType<typeof useFavorites>;
    onCreateFolder: (dir: string) => void;
    onPickDir: (defaultDir: string) => Promise<string | null>;
    onPreviewImage: (file: FileEntry) => void;
    onPreviewVideo: (file: FileEntry) => void;
    volumeEject: ReturnType<typeof useVolumeEject>;
    /** 设为桌面墙纸：待确认图片与请求状态 */
    wallpaper: ReturnType<typeof useWallpaper>;
  };
  /** 预览层：两套预览 hook、删除请求（预览里也能删）与各预览默认是否全屏 */
  preview: {
    blocked: boolean;
    defaultFullscreen: { image: boolean; video: boolean };
    image: ReturnType<typeof useImagePreview>;
    /** 预览中的这张图是否已在待拖拽区（header 那颗按钮的「已加入」态） */
    imageStaged: boolean;
    /** 把预览中的这张图收进待拖拽区 */
    onStageImage: () => void;
    video: ReturnType<typeof useVideoPreview>;
    onRequestDelete: (path: string) => void;
  };
};
