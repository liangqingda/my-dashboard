/**
 * 图片预览弹窗的常量：裁剪偏好的命名空间与字段名。
 *
 * 偏好按「一个命名空间一个对象」存在 localStorage，字段名在这里定一次；
 * 命名空间的页面标识由调用方传入（`storageScope`），本组件不写死是哪一页。
 */

import { createChoiceFieldCodec } from '@/utils/local-storage';

import type { ImageCropMode } from './types';

/** 偏好在 localStorage 里的能力名：拼成 `<页面标识>:image-preview` */
export const IMAGE_PREVIEW_CAPABILITY = 'image-preview';

/** 裁剪偏好的字段名：改字段等于让已存的偏好失效，别随手改名 */
export const CROP_MODE_FIELD = 'cropSaveMode';

/** 保存方式：默认替换源文件；存储里是脏值时也回落到它 */
export const CROP_MODE_CODEC = createChoiceFieldCodec<ImageCropMode>(
  ['replace', 'copy'],
  'replace',
);
