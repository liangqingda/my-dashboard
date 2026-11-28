/**
 * 文件页的视频预览编排：当前目录里哪些文件能播、现在在放哪一条、截的图落到哪里。
 * 播放器与弹窗本身归 `VideoPreviewModal`，这里只把文件条目翻译成它的入参；
 * 「列表 + 选中项」的通用部分走 `usePreviewList`。
 */

import { useMemo } from 'react';

import type {
  VideoPreviewCaptureReceipt,
  VideoPreviewItem,
} from '@/components/modals/VideoPreviewModal/types';

import type { DirListing, FileEntry, VideoOpenMode } from '../types';
import { videoContentUrl } from '../utils/files-api';
import { fileThumbUrl } from '../utils/media-thumbs';

import { useOpenExternal } from './useOpenExternal';
import { usePreviewList } from './usePreviewList';
import { useVideoCapture } from './useVideoCapture';

/** 视频预览 hook 的返回 */
export type UseVideoPreviewResult = {
  /** 弹窗条目：当前目录里的视频，顺序即翻篇与选集顺序；`src` 走 Range 流 */
  items: VideoPreviewItem[];
  /** 正在预览的视频路径；null 表示弹窗关闭 */
  activeId: string | null;
  /** 换过几次（计数浮标的切换序号）：翻篇 / 选集点选 / 删除后顺位切换都会加一 */
  switchTick: number;
  /** 打开某一条视频 */
  openVideo: (file: FileEntry) => void;
  /** 切到另一条（遮罩层里的翻篇与选集点选都走它） */
  selectVideo: (id: string) => void;
  /** 关闭预览 */
  closeVideo: () => void;
  /** 预览中的这条视频被删掉：切到下一条（没有了就关窗） */
  skipDeletedVideo: (path: string) => void;
  /** 截图当前帧并写进目标目录，返回给弹窗用的提示文案 */
  captureFrame: (
    dataUrl: string,
    captureDir: string,
  ) => Promise<VideoPreviewCaptureReceipt>;
  /** 选截图存放目录（系统目录选择框，默认定位到当前目录）；取消返回 null */
  pickMediaDir: () => Promise<string | null>;
  /** 用外部播放器打开某条视频：给定应用优先，其次 IINA，再回落系统默认；结果给一条提示 */
  openExternal: (id: string, appName?: string) => void;
};

/** 视频预览的调用方设置：点视频的去向由文件页设置决定 */
export type UseVideoPreviewOptions = {
  /** 视频点击后：弹窗预览 / 外部应用 */
  videoOpenMode: VideoOpenMode;
  /** 外部打开用的应用名 */
  videoApp: string;
};

/**
 * 管理文件页的视频预览状态。
 *
 * @param listing 当前目录清单；换目录后旧视频自然不在列表里，预览随之关闭
 * @param options 设置里的「视频点击后」去向：走外部应用时点击直接交给播放器，不开弹窗
 */
export const useVideoPreview = (
  listing: DirListing | null,
  { videoApp, videoOpenMode }: UseVideoPreviewOptions,
): UseVideoPreviewResult => {
  const list = usePreviewList(listing, 'video');
  const { captureFrame, pickMediaDir } = useVideoCapture({
    defaultDir: listing?.path ?? null,
  });
  const openExternal = useOpenExternal();

  /** 条目只在视频列表变化时重算 */
  const items = useMemo(
    () =>
      list.items.map((file) => ({
        id: file.path,
        name: file.name,
        poster: fileThumbUrl(file.path),
        src: videoContentUrl(file.path),
      })),
    [list.items],
  );

  /** 点视频：按设置分流——外部模式直接把文件交给播放器，否则在弹窗里播放 */
  const openVideo = (file: FileEntry) => {
    if (videoOpenMode === 'external') {
      openExternal(file.path, videoApp);

      return;
    }

    list.open(file);
  };

  return {
    activeId: list.activeId,
    captureFrame,
    closeVideo: list.close,
    items,
    openExternal,
    openVideo,
    pickMediaDir,
    selectVideo: list.select,
    skipDeletedVideo: list.skipDeleted,
    switchTick: list.switchTick,
  };
};
