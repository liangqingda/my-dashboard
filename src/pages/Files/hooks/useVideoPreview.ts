/**
 * 文件页的视频预览编排：当前目录里哪些文件能播、现在在放哪一条、截的图落到哪里。
 * 播放器与弹窗本身归 `VideoPreviewModal`，这里只把文件条目翻译成它的入参；
 * 「列表 + 选中项」的通用部分走 `usePreviewList`。
 */

import { useMemo } from 'react';
import { notifications } from '@mantine/notifications';

import type {
  VideoPreviewCaptureReceipt,
  VideoPreviewItem,
} from '@/components/modals/VideoPreviewModal/types';
import { getErrorMessage } from '@/utils/error';

import type { DirListing, FileEntry } from '../types';
import {
  captureVideoFrame,
  openFileExternally,
  pickPickedDir,
  videoContentUrl,
} from '../utils/files-api';

import { usePreviewList } from './usePreviewList';

/** 视频预览 hook 的返回 */
export type UseVideoPreviewResult = {
  /** 弹窗条目：当前目录里的视频，顺序即翻篇与侧栏顺序；`src` 走 Range 流 */
  items: VideoPreviewItem[];
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
  /** 用外部播放器打开某条视频：IINA 优先，回落系统默认；结果给一条提示 */
  openExternal: (id: string) => void;
};

/**
 * 管理文件页的视频预览状态。
 *
 * @param listing 当前目录清单；换目录后旧视频自然不在列表里，预览随之关闭
 */
export const useVideoPreview = (
  listing: DirListing | null,
): UseVideoPreviewResult => {
  const list = usePreviewList(listing, 'video');

  /** 条目只在视频列表变化时重算 */
  const items = useMemo(
    () =>
      list.items.map((file) => ({
        id: file.path,
        name: file.name,
        src: videoContentUrl(file.path),
      })),
    [list.items],
  );

  /** 中间件写盘后回文件名：提示里带上目标目录与文件名，用户能直接去找 */
  const captureFrame = async (
    dataUrl: string,
    captureDir: string,
  ): Promise<VideoPreviewCaptureReceipt> => {
    const name = await captureVideoFrame(dataUrl, captureDir);
    const target = captureDir.length > 0 ? captureDir : '桌面';

    return { message: `已保存到${target}：${name}` };
  };

  /**
   * 外部打开：把解码交给本地播放器（IINA / mpv 的硬解与直接读盘比浏览器快得多）。
   * 提示里区分「IINA」与「系统默认」，失败也给原因，不让按钮点了没反应。
   */
  const openExternal = (id: string) => {
    void openFileExternally(id)
      .then((app) => {
        notifications.show({
          message:
            app === 'iina'
              ? '已用 IINA 打开这个视频'
              : '已用系统默认播放器打开这个视频',
        });
      })
      .catch((error: unknown) => {
        notifications.show({
          color: 'red',
          message: getErrorMessage(error, '外部打开失败'),
        });
      });
  };

  /** 选截图目录：默认从当前目录弹起，用户取消不当作失败 */
  const pickCaptureDir = async (): Promise<string | null> => {
    const picked = await pickPickedDir(listing?.path ?? null);

    return 'path' in picked ? picked.path : null;
  };

  return {
    activeId: list.activeId,
    captureFrame,
    closeVideo: list.close,
    items,
    openExternal,
    openVideo: list.open,
    pickCaptureDir,
    selectVideo: list.select,
  };
};
