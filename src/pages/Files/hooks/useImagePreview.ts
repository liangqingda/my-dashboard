/**
 * 文件页的图片预览编排：当前目录里哪些文件能看、现在在看哪一张、裁剪结果落到哪。
 * 弹窗本身归 `ImagePreviewModal`，这里只把文件条目翻译成它的入参；
 * 「列表 + 选中项」的通用部分走 `usePreviewList`。
 */

import { useCallback, useMemo, useState } from 'react';

import type {
  ImageCropRequest,
  ImageCropResult,
  ImagePreviewItem,
} from '@/components/modals/ImagePreviewModal/types';

import type { DirListing, FileEntry } from '../types';
import { cropImage, imageContentUrl } from '../utils/files-api';

import { usePreviewList } from './usePreviewList';

/** 图片预览 hook 的入参 */
export type UseImagePreviewOptions = {
  /**
   * 裁剪落盘后的刷新：`copy` 会在同级多出一个「- 裁剪」目录，列表要重读才看得见。
   * `replace` 不刷——列表按修改时间排，重读会让预览中的这张跳到别的位置。
   */
  onSaved?: () => Promise<void> | void;
};

/** 图片预览 hook 的返回 */
export type UseImagePreviewResult = {
  /** 弹窗条目：当前目录里的图片，顺序即翻篇与列表顺序；`src` 整份返回 */
  items: ImagePreviewItem[];
  /** 正在预览的图片路径；null 表示弹窗关闭 */
  activeId: string | null;
  /** 换过几次（计数浮标的切换序号）：翻篇 / 列表点选 / 删除后顺位切换都会加一 */
  switchTick: number;
  /** 正在预览的那一条；没在预览时为 null（弹窗 header 的操作要拿它的名字） */
  activeItem: ImagePreviewItem | null;
  /** 打开某一张图片 */
  openImage: (file: FileEntry) => void;
  /** 切到另一张（翻篇与列表点选都走它） */
  selectImage: (id: string) => void;
  /** 关闭预览 */
  closeImage: () => void;
  /** 预览中的这张图被删掉：切到下一张（没有了就关窗） */
  skipDeletedImage: (path: string) => void;
  /** 保存裁剪结果：覆盖源文件时换一个地址版本让 `<img>` 重新取图，另存时刷新目录 */
  cropImage: (request: ImageCropRequest) => Promise<ImageCropResult>;
};

/**
 * 管理文件页的图片预览状态。
 *
 * @param listing 当前目录清单；换目录后旧图片自然不在列表里，预览随之关闭
 * @param onSaved 裁剪落盘后的目录刷新（`copy` 模式要它）
 */
export const useImagePreview = (
  listing: DirListing | null,
  { onSaved }: UseImagePreviewOptions = {},
): UseImagePreviewResult => {
  const list = usePreviewList(listing, 'image');
  /**
   * 图片地址的版本号：覆盖源文件后路径没变，浏览器不会自己重取，
   * 换个查询值让正在看的这张重新加载；另存模式不动它。
   */
  const [version, setVersion] = useState(0);

  /** 条目只在图片列表或地址版本变化时重算 */
  const items = useMemo(
    () =>
      list.items.map((file) => ({
        id: file.path,
        name: file.name,
        src: `${imageContentUrl(file.path)}${version > 0 ? `&v=${version}` : ''}`,
      })),
    [list.items, version],
  );

  const saveCrop = useCallback(
    async (request: ImageCropRequest): Promise<ImageCropResult> => {
      const result = await cropImage(request);

      if (result.mode === 'replace') {
        setVersion((prev) => prev + 1);
      } else {
        await onSaved?.();
      }

      return result;
    },
    [onSaved],
  );

  return {
    activeId: list.activeId,
    activeItem: items.find((item) => item.id === list.activeId) ?? null,
    closeImage: list.close,
    cropImage: saveCrop,
    items,
    openImage: list.open,
    selectImage: list.select,
    skipDeletedImage: list.skipDeleted,
    switchTick: list.switchTick,
  };
};
