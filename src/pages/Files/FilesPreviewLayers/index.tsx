/**
 * 页面级的预览弹层：视频与图片两扇弹窗的装配与挂载。
 * 数据、开关与回调都来自页面的预览 hook，这里只负责「什么状态下挂哪一扇、怎么把删除请求转给确认层」，
 * 免得页面正文被两段几乎同形的弹窗 JSX 撑大。
 */

import { useMemo } from 'react';

import ImagePreviewModal from '@/components/modals/ImagePreviewModal';
import type {
  ImageCropRequest,
  ImageCropResult,
  ImagePreviewItem,
} from '@/components/modals/ImagePreviewModal/types';
import { useProvidePreviewDockActions } from '@/components/modals/PreviewDockActions/hooks/useProvidePreviewDockActions';
import type { PreviewDockActions } from '@/components/modals/PreviewDockActions/types';
import VideoPreviewModal from '@/components/modals/VideoPreviewModal';
import type {
  VideoPreviewCaptureReceipt,
  VideoPreviewItem,
} from '@/components/modals/VideoPreviewModal/types';

import { FILES_STORAGE_SCOPE } from '../constants';

import styles from './index.scss';

/** 预览弹层的入参 */
export type FilesPreviewLayersProps = {
  /** 当前目录的视频条目 */
  videoItems: VideoPreviewItem[];
  /** 正在播的视频；null 表示视频弹窗关着 */
  videoActiveId: string | null;
  /** 切到某条视频 */
  onSelectVideo: (id: string) => void;
  /** 关视频弹窗 */
  onCloseVideo: () => void;
  /** 截当前帧并落盘 */
  onCaptureVideo: (
    dataUrl: string,
    dir: string,
  ) => Promise<VideoPreviewCaptureReceipt>;
  /** 选截图存放目录；取消返回 null */
  onPickDir: () => Promise<string | null>;
  /** 用外部播放器打开某条视频 */
  onOpenExternal: (id: string) => void;
  /** 设置里选定的外部播放器名称（跟设置列表走，如 IINA / TV） */
  externalApp: string;
  /** 当前目录的图片条目 */
  imageItems: ImagePreviewItem[];
  /** 预览中的这张图是否已在待拖拽区（header 那颗按钮的「已加入」态） */
  imageStaged: boolean;
  /** 两扇预览是否打开即全屏（来自文件页设置） */
  defaultFullscreen: { image: boolean; video: boolean };
  /** 正在看的图片；null 表示图片弹窗关着 */
  imageActiveId: string | null;
  /** 图片预览的切换序号（删掉当前这张后顺位切换也会加一） */
  imageSwitchTick: number;
  /** 切到某张图片 */
  onSelectImage: (id: string) => void;
  /** 关图片弹窗 */
  onCloseImage: () => void;
  /** 保存图片裁剪结果（覆盖源文件 / 另存到「- 裁剪」目录） */
  onCropImage: (request: ImageCropRequest) => Promise<ImageCropResult>;
  /** 请求删除某个条目（按路径，两扇弹窗共用同一套二次确认） */
  onRequestDelete: (path: string) => void;
  /** 请求把某张图片设为桌面墙纸（只打开二次确认层，真正设置归确认层） */
  onRequestWallpaper: (id: string, name: string) => void;
  /** 把某张图片加入 / 移出待拖拽区 */
  onToggleImage: (id: string) => void;
  /** 把某条视频加入 / 移出待拖拽区 */
  onToggleVideo: (id: string) => void;
  /** 待拖拽区里的路径：程序坞窗口据此判断当前条目是否已加入 */
  pendingPaths: readonly string[];
  /** 预览中的这条视频是否已在待拖拽区（控制栏那颗按钮的「已加入」态） */
  videoStaged: boolean;
  /** 删除确认开着：两扇弹窗都收掉快捷键与焦点陷阱 */
  blocked: boolean;
  /** 视频预览的切换序号（删掉当前这条后顺位切换也会加一） */
  videoSwitchTick: number;
};

const FilesPreviewLayers = ({
  blocked,
  defaultFullscreen,
  externalApp,
  imageActiveId,
  imageItems,
  imageStaged,
  imageSwitchTick,
  onCaptureVideo,
  onCloseImage,
  onCloseVideo,
  onCropImage,
  onOpenExternal,
  onPickDir,
  onRequestDelete,
  onRequestWallpaper,
  onSelectImage,
  onSelectVideo,
  onToggleImage,
  onToggleVideo,
  pendingPaths,
  videoActiveId,
  videoItems,
  videoStaged,
  videoSwitchTick,
}: FilesPreviewLayersProps) => {
  const actions = useMemo<PreviewDockActions>(
    () => ({
      blocked,
      image: {
        isBatched: (id) => pendingPaths.includes(id),
        onCrop: onCropImage,
        onRequestDelete,
        onRequestWallpaper,
        onToggleBatch: onToggleImage,
      },
      video: {
        externalApp,
        isBatched: (id) => pendingPaths.includes(id),
        onCapture: onCaptureVideo,
        onOpenExternal,
        onPickDir,
        onRequestDelete,
        onToggleBatch: onToggleVideo,
      },
    }),
    [
      blocked,
      externalApp,
      onCaptureVideo,
      onCropImage,
      onOpenExternal,
      onPickDir,
      onRequestDelete,
      onRequestWallpaper,
      onToggleImage,
      onToggleVideo,
      pendingPaths,
    ],
  );

  useProvidePreviewDockActions(actions);

  return (
  /* 容器只为挂载，`display: contents` 不进布局：两扇弹窗都挂在 body 里的 portal 上 */
  <div className={styles.layers}>
    <VideoPreviewModal
      activeId={videoActiveId}
      batched={videoStaged}
      blocked={blocked}
      defaultFullscreen={defaultFullscreen.video}
      externalApp={externalApp}
      items={videoItems}
      onCapture={onCaptureVideo}
      onClose={onCloseVideo}
      onOpenExternal={onOpenExternal}
      onPickDir={onPickDir}
      onRequestDelete={onRequestDelete}
      onSelect={onSelectVideo}
      onToggleBatch={onToggleVideo}
      opened={videoActiveId !== null}
      storageScope={FILES_STORAGE_SCOPE}
      switchTick={videoSwitchTick}
    />

    <ImagePreviewModal
      activeId={imageActiveId}
      batched={imageStaged}
      blocked={blocked}
      defaultFullscreen={defaultFullscreen.image}
      items={imageItems}
      onClose={onCloseImage}
      onCrop={onCropImage}
      onRequestDelete={onRequestDelete}
      onRequestWallpaper={onRequestWallpaper}
      onSelect={onSelectImage}
      onToggleBatch={onToggleImage}
      opened={imageActiveId !== null}
      storageScope={FILES_STORAGE_SCOPE}
      switchTick={imageSwitchTick}
    />
  </div>
  );
};

export default FilesPreviewLayers;
