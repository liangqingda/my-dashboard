/**
 * 文件页的视频预览编排：当前目录里哪些文件能播、现在在放哪一条、截的图落到哪里。
 * 播放器与弹窗本身归 `VideoPreviewModal`，这里只把文件条目翻译成它的入参。
 */

import { useMemo, useState } from 'react';

import type { VideoPreviewCaptureReceipt } from '@/components/modals/VideoPreviewModal/types';

import type { DirListing, FileEntry } from '../types';
import { captureVideoFrame, pickPickedDir } from '../utils/files-api';

/** 视频预览 hook 的返回 */
export type UseVideoPreviewResult = {
  /** 当前目录里的视频（按文件名顺序，翻篇与侧栏都用它） */
  videos: FileEntry[];
  /** 正在预览的视频路径；null 表示弹窗关闭 */
  activeId: string | null;
  /** 打开某一条视频 */
  openVideo: (file: FileEntry) => void;
  /** 切到另一条（遮罩层里的翻篇与侧栏点选都走它） */
  selectVideo: (id: string) => void;
  /** 关闭预览 */
  closeVideo: () => void;
  /** 截图当前帧并写进目标目录，返回给弹窗用的提示文案 */
  captureFrame: (
    dataUrl: string,
    captureDir: string,
  ) => Promise<VideoPreviewCaptureReceipt>;
  /** 选截图目录（系统目录选择框，默认定位到当前目录）；取消返回 null */
  pickCaptureDir: () => Promise<string | null>;
};

/**
 * 管理文件页的视频预览状态。
 *
 * @param listing 当前目录清单；换目录后旧视频自然不在列表里，预览随之关闭
 */
export const useVideoPreview = (
  listing: DirListing | null,
): UseVideoPreviewResult => {
  const [activeId, setActiveId] = useState<string | null>(null);

  /** 视频列表只在清单变化时重算：挑出分类为视频的直属文件 */
  const videos = useMemo(
    () => (listing?.files ?? []).filter((file) => file.category === 'video'),
    [listing],
  );

  /**
   * 条目已经不在列表里（删除、换目录）就按「没在预览」处理：
   * 播放地址指向已删文件时浏览器只会报错，留着弹窗没有意义。
   * 在读时算派生值，不拿 effect 回写状态——否则每删一条都要多渲染一轮。
   */
  const activeVideoId =
    activeId !== null && videos.some((file) => file.path === activeId)
      ? activeId
      : null;

  const openVideo = (file: FileEntry) => setActiveId(file.path);
  const selectVideo = (id: string) => setActiveId(id);
  const closeVideo = () => setActiveId(null);

  /** 中间件写盘后回文件名：提示里带上目标目录与文件名，用户能直接去找 */
  const captureFrame = async (
    dataUrl: string,
    captureDir: string,
  ): Promise<VideoPreviewCaptureReceipt> => {
    const name = await captureVideoFrame(dataUrl, captureDir);
    const target = captureDir.length > 0 ? captureDir : '桌面';

    return { message: `已保存到${target}：${name}` };
  };

  /** 选截图目录：默认从当前目录弹起，用户取消不当作失败 */
  const pickCaptureDir = async (): Promise<string | null> => {
    const picked = await pickPickedDir(listing?.path ?? null);

    return 'path' in picked ? picked.path : null;
  };

  return {
    activeId: activeVideoId,
    captureFrame,
    closeVideo,
    openVideo,
    pickCaptureDir,
    selectVideo,
    videos,
  };
};
