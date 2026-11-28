/**
 * 图片裁剪的纯函数：默认选框、像素换算与 canvas 编码。
 *
 * 选框用**相对图片显示区域的比例**存（0–1），显示多大、窗口怎么缩放都不影响裁剪结果；
 * 保存时再按源图的原始像素换算，换算出界与 0 尺寸都在这里兜住。
 */

import type { SelectionRect } from '@/components/file-preview/FreeImageSelection/types';

/** 裁剪框：相对源图的比例坐标（0–1），与 `FreeImageSelection` 的选框同一套 */
export type CropRect = SelectionRect;

/** 进入裁剪模式时的默认选框：居中、四周各留一成 */
export const DEFAULT_CROP_RECT: CropRect = {
  height: 0.8,
  width: 0.8,
  x: 0.1,
  y: 0.1,
};

/**
 * 源文件扩展名 → canvas 能编码的 data URL 类型。
 * 与中间件 `files-crop.ts` 的白名单同一套：换格式会让扩展名和内容对不上，这里也不收。
 */
const CROP_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** 这张图能不能裁：只看扩展名（浏览器解不动 / 编不回的格式一律不进裁剪模式） */
export const cropMimeForName = (name: string): string | null => {
  const dot = name.lastIndexOf('.');

  if (dot < 0) {
    return null;
  }

  return CROP_MIME_BY_EXTENSION[name.slice(dot).toLowerCase()] ?? null;
};

/** 把比例换算成源图像素：至少 1px、不越界 */
export const cropRectToPixels = (
  rect: CropRect,
  naturalWidth: number,
  naturalHeight: number,
): { sx: number; sy: number; sw: number; sh: number } | null => {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const sx = Math.min(
    Math.max(Math.round(rect.x * naturalWidth), 0),
    naturalWidth - 1,
  );
  const sy = Math.min(
    Math.max(Math.round(rect.y * naturalHeight), 0),
    naturalHeight - 1,
  );
  const sw = Math.min(
    Math.max(Math.round(rect.width * naturalWidth), 1),
    naturalWidth - sx,
  );
  const sh = Math.min(
    Math.max(Math.round(rect.height * naturalHeight), 1),
    naturalHeight - sy,
  );

  return { sh, sw, sx, sy };
};

/**
 * 把选框里的画面画到 canvas 上，按源扩展名编成 data URL。
 * 解不出源图尺寸、拿不到 2D 上下文或编码失败都返回 null（调用方据此提示「裁剪失败」）。
 */
export const renderCropDataUrl = (
  image: HTMLImageElement,
  rect: CropRect,
  name: string,
): string | null => {
  const mime = cropMimeForName(name);
  const pixels = cropRectToPixels(rect, image.naturalWidth, image.naturalHeight);

  if (mime === null || pixels === null) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (context === null) {
    return null;
  }

  canvas.width = pixels.sw;
  canvas.height = pixels.sh;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    pixels.sx,
    pixels.sy,
    pixels.sw,
    pixels.sh,
    0,
    0,
    pixels.sw,
    pixels.sh,
  );

  try {
    return mime === 'image/jpeg'
      ? canvas.toDataURL(mime, 0.92)
      : canvas.toDataURL(mime);
  } catch {
    return null;
  }
};
