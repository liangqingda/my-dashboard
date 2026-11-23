/**
 * 文件页的图片预览编排：当前目录里哪些文件能看、现在在看哪一张。
 * 弹窗本身归 `ImagePreviewModal`，这里只把文件条目翻译成它的入参；
 * 「列表 + 选中项」的通用部分走 `usePreviewList`。
 */

import { useMemo } from 'react';

import type { ImagePreviewItem } from '@/components/modals/ImagePreviewModal/types';

import type { DirListing, FileEntry } from '../types';
import { imageContentUrl } from '../utils/files-api';

import { usePreviewList } from './usePreviewList';

/** 图片预览 hook 的返回 */
export type UseImagePreviewResult = {
  /** 弹窗条目：当前目录里的图片，顺序即翻篇与侧栏顺序；`src` 整份返回 */
  items: ImagePreviewItem[];
  /** 正在预览的图片路径；null 表示弹窗关闭 */
  activeId: string | null;
  /** 打开某一张图片 */
  openImage: (file: FileEntry) => void;
  /** 切到另一张（翻篇与侧栏点选都走它） */
  selectImage: (id: string) => void;
  /** 关闭预览 */
  closeImage: () => void;
};

/**
 * 管理文件页的图片预览状态。
 *
 * @param listing 当前目录清单；换目录后旧图片自然不在列表里，预览随之关闭
 */
export const useImagePreview = (
  listing: DirListing | null,
): UseImagePreviewResult => {
  const list = usePreviewList(listing, 'image');

  /** 条目只在图片列表变化时重算 */
  const items = useMemo(
    () =>
      list.items.map((file) => ({
        id: file.path,
        name: file.name,
        src: imageContentUrl(file.path),
      })),
    [list.items],
  );

  return {
    activeId: list.activeId,
    closeImage: list.close,
    items,
    openImage: list.open,
    selectImage: list.select,
  };
};
