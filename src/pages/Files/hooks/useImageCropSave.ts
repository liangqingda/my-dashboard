/**
 * 图片裁剪落盘的共用动作：文件页预览与程序坞图片窗都走这一份。
 *
 * 覆盖源文件时路径不变，浏览器不会自己重取图，这里用一个版本号让 `<img>` 换查询值重新加载；
 * 另存模式只多出一个「- 裁剪」目录，由调用方决定要不要重读列表。
 */

import { useCallback, useState } from 'react';

import type {
  ImageCropRequest,
  ImageCropResult,
} from '@/components/modals/ImagePreviewModal/types';

import { cropImage as requestCrop } from '../utils/files-api';

/** 裁剪动作的入参 */
export type UseImageCropSaveOptions = {
  /** `copy` 模式落盘后的列表刷新：文件页传目录重读，坞窗没有列表可刷时省略 */
  onSaved?: () => Promise<void> | void;
};

/**
 * 管理裁剪写盘与地址版本。
 *
 * @returns 裁剪动作与当前地址版本：版本大于 0 时调用方要把它拼进图片地址
 */
export const useImageCropSave = ({
  onSaved,
}: UseImageCropSaveOptions = {}) => {
  const [version, setVersion] = useState(0);

  const cropImage = useCallback(
    async (request: ImageCropRequest): Promise<ImageCropResult> => {
      const result = await requestCrop(request);

      if (result.mode === 'replace') {
        setVersion((prev) => prev + 1);
      } else {
        await onSaved?.();
      }

      return result;
    },
    [onSaved],
  );

  return { cropImage, version };
};
