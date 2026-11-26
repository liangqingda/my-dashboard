/**
 * 视频预览弹窗的常量：截图提示、设置项字段与默认值、快捷键清单。
 *
 * 偏好按「一个命名空间一个对象」存在 localStorage，字段名与编解码都在这里定一次；
 * 命名空间的页面标识由调用方传入（`storageScope`），本组件不写死是哪一页。
 */

import type { StoredFieldCodec } from '@/utils/local-storage';
import { createChoiceFieldCodec } from '@/utils/local-storage';

/** 截图成功通知的标题 */
export const CAPTURE_NOTICE_TITLE = '已保存截图';

/** 截图失败通知的标题 */
export const CAPTURE_FAILED_TITLE = '截图失败';

/** 偏好在 localStorage 里的能力名：拼成 `<页面标识>:video-preview` */
export const SETTINGS_CAPABILITY = 'video-preview';

/** 设置对象的字段名：改字段等于让已存的偏好失效，别随手改名 */
export const SETTINGS_FIELD = {
  arrowMode: 'arrowMode',
  captureDir: 'captureDir',
  previewScale: 'previewScale',
  seekStep: 'seekStep',
  spaceMode: 'spaceMode',
  viewportFullscreen: 'viewportFullscreen',
} as const;

/** 进度条悬停预览的帧图大小：默认占视频画面宽度的百分比 */
export const DEFAULT_PREVIEW_SCALE = 60;

/** 预览帧大小的下限（%）：再小帧内容就认不出来了 */
export const MIN_PREVIEW_SCALE = 30;

/** 预览帧大小的上限（%）：留一圈画面，不把视频整块盖住 */
export const MAX_PREVIEW_SCALE = 90;

/** 预览帧大小每次调整的步长（%） */
export const PREVIEW_SCALE_STEP = 5;

/** 预览帧大小的编解码：非数字 / 越界都夹回 30–90，脏值不会让浮层大到糊住画面 */
export const PREVIEW_SCALE_CODEC: StoredFieldCodec<number> = {
  decode: (value) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, Math.round(value)))
      : DEFAULT_PREVIEW_SCALE,
  encode: (value) => value,
};

/** ← / → 的两种去向：快进 / 后退（默认）与翻篇 */
export const ARROW_MODES = ['seek', 'nav'] as const;

/** 方向键去向 */
export type VideoArrowMode = (typeof ARROW_MODES)[number];

/** 快进 / 后退的默认步长（秒） */
export const DEFAULT_SEEK_STEP = 10;

/** 步长下限（秒） */
export const MIN_SEEK_STEP = 1;

/** 步长上限（秒）：再大就不如直接拖进度条 */
export const MAX_SEEK_STEP = 600;

/** 空格键的两种去向：播放 / 暂停（默认）与关闭弹窗 */
export const SPACE_MODES = ['play', 'close'] as const;

/** 空格键去向 */
export type VideoSpaceMode = (typeof SPACE_MODES)[number];

/** 空格键去向的编解码：不认识的存值回落「播放 / 暂停」 */
export const SPACE_MODE_CODEC = createChoiceFieldCodec<VideoSpaceMode>(
  SPACE_MODES,
  'play',
);

/** 方向键去向的编解码：不认识的存值回落「快进 / 后退」 */
export const ARROW_MODE_CODEC = createChoiceFieldCodec<VideoArrowMode>(
  ARROW_MODES,
  'seek',
);

/** 步长的编解码：非数字 / 越界都夹回合法区间，脏值不会把进度条一次拖到片尾 */
export const SEEK_STEP_CODEC: StoredFieldCodec<number> = {
  decode: (value) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(MAX_SEEK_STEP, Math.max(MIN_SEEK_STEP, Math.round(value)))
      : DEFAULT_SEEK_STEP,
  encode: (value) => value,
};

/**
 * 截图目录的编解码：空串表示默认，默认落到桌面——
 * 具体落点由调用方的落盘接口解释。
 */
export const EXPORT_DIR_CODEC: StoredFieldCodec<string> = {
  decode: (value) => (typeof value === 'string' ? value : ''),
  encode: (value) => value,
};

/** 设置弹层宽度：三列字段 + 双列快捷键也要排得开 */
export const SETTINGS_PANEL_WIDTH = 520;
