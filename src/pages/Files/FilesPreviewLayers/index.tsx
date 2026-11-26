/**
 * 页面级的预览弹层：视频与图片两扇弹窗的装配与挂载。
 * 数据、开关与回调都来自页面的预览 hook，这里只负责「什么状态下挂哪一扇、怎么把删除请求转给确认层」，
 * 免得页面正文被两段几乎同形的弹窗 JSX 撑大。
 */

import ImagePreviewModal from '@/components/modals/ImagePreviewModal';
import type { ImagePreviewItem } from '@/components/modals/ImagePreviewModal/types';
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
  /** 当前目录的图片条目 */
  imageItems: ImagePreviewItem[];
  /** 两扇预览是否打开即全屏（来自文件页设置） */
  defaultFullscreen: { image: boolean; video: boolean };
  /** 正在看的图片；null 表示图片弹窗关着 */
  imageActiveId: string | null;
  /** 切到某张图片 */
  onSelectImage: (id: string) => void;
  /** 关图片弹窗 */
  onCloseImage: () => void;
  /** 请求删除某个条目（按路径，两扇弹窗共用同一套二次确认） */
  onRequestDelete: (path: string) => void;
  /** 请求把当前预览的图片设为桌面墙纸（只打开二次确认层，真正设置归确认层） */
  onRequestWallpaper: () => void;
  /** 删除确认开着：两扇弹窗都收掉快捷键与焦点陷阱 */
  blocked: boolean;
};

const FilesPreviewLayers = ({
  blocked,
  defaultFullscreen,
  imageActiveId,
  imageItems,
  onCaptureVideo,
  onCloseImage,
  onCloseVideo,
  onOpenExternal,
  onPickDir,
  onRequestDelete,
  onRequestWallpaper,
  onSelectImage,
  onSelectVideo,
  videoActiveId,
  videoItems,
}: FilesPreviewLayersProps) => (
  /* 容器只为挂载，`display: contents` 不进布局：两扇弹窗都挂在 body 里的 portal 上 */
  <div className={styles.layers}>
    <VideoPreviewModal
      activeId={videoActiveId}
      blocked={blocked}
      defaultFullscreen={defaultFullscreen.video}
      items={videoItems}
      onCapture={onCaptureVideo}
      onClose={onCloseVideo}
      onOpenExternal={onOpenExternal}
      onPickDir={onPickDir}
      onRequestDelete={
        videoActiveId !== null ? () => onRequestDelete(videoActiveId) : null
      }
      onSelect={onSelectVideo}
      opened={videoActiveId !== null}
      storageScope={FILES_STORAGE_SCOPE}
    />

    <ImagePreviewModal
      activeId={imageActiveId}
      blocked={blocked}
      defaultFullscreen={defaultFullscreen.image}
      items={imageItems}
      onClose={onCloseImage}
      onRequestDelete={
        imageActiveId !== null ? () => onRequestDelete(imageActiveId) : null
      }
      onRequestWallpaper={onRequestWallpaper}
      onSelect={onSelectImage}
      opened={imageActiveId !== null}
    />
  </div>
);

export default FilesPreviewLayers;
