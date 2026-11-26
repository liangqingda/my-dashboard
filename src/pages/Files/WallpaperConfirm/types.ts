/**
 * 设为桌面墙纸确认弹窗的入参：要铺哪一张、是否正在设置、取消与确认。
 */

import type { WallpaperRequest } from '../hooks/useWallpaper';

/** 弹窗的入参 */
export type WallpaperConfirmProps = {
  /** 等待确认的图片；null 表示弹窗关闭 */
  request: WallpaperRequest | null;
  /** 换墙纸请求进行中：按钮转圈并禁用 */
  loading: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 确认设为墙纸 */
  onConfirm: () => void;
};
