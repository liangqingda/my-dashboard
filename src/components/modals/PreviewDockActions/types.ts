/**
 * 文件预览在程序坞窗口里的能力桥。
 *
 * 预览弹窗收起后页面状态可能还在（也可能已经换页），程序坞窗口拿不到页面 hook，
 * 所以由页面在挂载期间把同一套回调登记进来；窗口恢复时优先用这份能力，
 * 页面不在了就只保留窗口自身能完成的操作。
 */

import type { VideoPreviewCaptureReceipt } from '@/components/modals/VideoPreviewModal/types';
import type {
  ImageCropRequest,
  ImageCropResult,
} from '@/components/modals/ImagePreviewModal/types';

/** 视频预览在程序坞里可用的页面能力 */
export type VideoDockActions = {
  /** 设置里选定的外部播放器名称 */
  externalApp?: string;
  /** 截当前帧并落盘 */
  onCapture: (
    dataUrl: string,
    captureDir: string,
  ) => Promise<VideoPreviewCaptureReceipt>;
  /** 选截图目录；取消返回 null */
  onPickDir: () => Promise<string | null>;
  /** 用外部播放器打开某一条 */
  onOpenExternal: (id: string) => void;
  /** 请求删除某一条（页面负责二次确认） */
  onRequestDelete: (id: string) => void;
  /** 把某一条加入 / 移出待拖拽区 */
  onToggleBatch: (id: string) => void;
  /** 某一条是否已在待拖拽区 */
  isBatched: (id: string) => boolean;
};

/** 图片预览在程序坞里可用的页面能力 */
export type ImageDockActions = {
  /** 保存裁剪结果 */
  onCrop: (request: ImageCropRequest) => Promise<ImageCropResult>;
  /** 请求删除某一张 */
  onRequestDelete: (id: string) => void;
  /** 请求把某一张设为桌面墙纸 */
  onRequestWallpaper: (id: string, name: string) => void;
  /** 把某一张加入 / 移出待拖拽区 */
  onToggleBatch: (id: string) => void;
  /** 某一张是否已在待拖拽区 */
  isBatched: (id: string) => boolean;
};

/** 页面挂载期间登记的一整套预览能力 */
export type PreviewDockActions = {
  /** 页面里是否有二次确认层开着：两层都收掉快捷键与焦点 */
  blocked: boolean;
  /** 图片预览能力 */
  image: ImageDockActions;
  /** 视频预览能力 */
  video: VideoDockActions;
};
