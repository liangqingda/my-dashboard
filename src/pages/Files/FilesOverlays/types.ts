/**
 * 文件页的三层浮层：拖拽层、业务弹窗、预览层。
 * 入参给的是页面持有的 hook 与少量派生值，扁平 props 在这一层内部拼好——
 * 页面正文里不该出现几十行「把字段一个个传下去」。
 */

import type { useDragPending } from '../hooks/use-drag-pending';
import type { useEntryActions } from '../hooks/useEntryActions';
import type { useEntryDelete } from '../hooks/useEntryDelete';
import type { useFavorites } from '../hooks/useFavorites';
import type { useImagePreview } from '../hooks/useImagePreview';
import type { useVideoPreview } from '../hooks/useVideoPreview';
import type { useAppUninstall } from '../hooks/useAppUninstall';
import type { useVolumeEject } from '../hooks/useVolumeEject';
import type { MoveProgress } from '../hooks/use-drag-move/types';
import type { FileEntry } from '../types';

/** 三层浮层的入参 */
export type FilesOverlaysProps = {
  /** 拖拽层：待拖拽区状态、条目动作编排、从列表拖进待拖拽区的收件回调 */
  drag: {
    entryActions: ReturnType<typeof useEntryActions>;
    pending: ReturnType<typeof useDragPending>;
    onDropPaths: (paths: string[]) => void;
    onSelectAll: () => void;
    /** 「拖拽全部」起拖：按当前设置走弹窗或直接拖 */
    onDragAll: () => void;
    /** 这一程拖拽结束：页面统一收掉两套拖拽状态 */
    onTrayDragEnd: () => void;
  };
  /** 业务弹窗：删除 / 改名 / 卸载 / 推出外接盘 / 拖拽移动 */
  modals: {
    /** 正在搬的进度：弹窗模式与直接拖模式各给一份，null 时进度窗收起 */
    moveProgress: MoveProgress | null;
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
  };
  /** 预览层：两套预览 hook、删除请求（预览里也能删）与各预览默认是否全屏 */
  preview: {
    blocked: boolean;
    defaultFullscreen: { image: boolean; video: boolean };
    image: ReturnType<typeof useImagePreview>;
    video: ReturnType<typeof useVideoPreview>;
    onRequestDelete: (path: string) => void;
  };
};
