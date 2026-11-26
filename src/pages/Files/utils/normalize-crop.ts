/**
 * 裁剪落盘响应的归一化：保存方式只认两档，路径 / 文件名 / 目录任一缺失就返回 null。
 * 与其它响应归一化分开成一份文件——裁剪是独立能力，`normalize.ts` 只放列表与通用条目。
 */

import type { ImageCropResult } from '@/components/modals/ImagePreviewModal/types';

import { asString, isObject } from './normalize-primitives';

/** 归一化 `{ crop }`：替换回来的是原路径，另存回来的是新目录里的新文件名 */
export const normalizeCropResponse = (
  payload: unknown,
): ImageCropResult | null => {
  const crop = isObject(payload) ? payload.crop : null;

  if (!isObject(crop)) {
    return null;
  }

  if (crop.mode !== 'replace' && crop.mode !== 'copy') {
    return null;
  }

  const name = asString(crop.name);
  const dir = asString(crop.dir);
  const filePath = asString(crop.path);

  if (name.length === 0 || dir.length === 0 || filePath.length === 0) {
    return null;
  }

  return { dir, mode: crop.mode, name, path: filePath };
};
