/**
 * 桌面墙纸编排：列表里图片瓦片的 hover 按钮与图片预览 header 的按钮共用这一套。
 * 只记「哪张图在等确认」与请求态；二次确认层、成功 / 失败提示都收在这里，
 * 页面只把两个入口接上（瓦片的 `onSetWallpaper`、预览弹窗的 `onRequestWallpaper`）。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import { setDesktopWallpaper } from '../utils/files-api';

/** 等待确认设墙纸的一张图 */
export type WallpaperRequest = {
  /** 文件名（不含路径）：确认弹窗与成功提示里说「哪一张」 */
  name: string;
  /** 图片绝对路径，提交给中间件 */
  path: string;
};

/** 设墙纸编排的返回 */
export type UseWallpaperResult = {
  /** 等待确认的图片；null 表示确认弹窗关闭 */
  request: WallpaperRequest | null;
  /** 换墙纸请求进行中：确认按钮转圈并禁用 */
  loading: boolean;
  /** 点按钮：记下目标，先弹二次确认 */
  requestWallpaper: (request: WallpaperRequest) => void;
  /** 取消：只关弹窗，不动系统 */
  cancel: () => void;
  /** 确认：调中间件把这张图铺到桌面 */
  confirm: () => Promise<void>;
};

/**
 * 管理「设为桌面墙纸」的确认与请求。
 * 成功才关弹窗；失败保留弹窗并弹红色通知，用户可原样再点一次。
 */
export const useWallpaper = (): UseWallpaperResult => {
  const [request, setRequest] = useState<WallpaperRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const requestWallpaper = (target: WallpaperRequest) => setRequest(target);

  const cancel = () => setRequest(null);

  const confirm = async () => {
    if (request === null) {
      return;
    }

    setLoading(true);

    try {
      await setDesktopWallpaper(request.path);
      notifications.show({
        title: '已设为桌面墙纸',
        message: `「${request.name}」已铺到桌面`,
        color: 'teal',
        autoClose: 4000,
      });
      setRequest(null);
    } catch (err) {
      notifications.show({
        title: '设置墙纸失败',
        message: getErrorMessage(err, '请稍后重试'),
        color: 'red',
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return { cancel, confirm, loading, request, requestWallpaper };
};
