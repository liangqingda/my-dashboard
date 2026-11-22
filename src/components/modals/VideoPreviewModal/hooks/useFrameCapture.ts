/**
 * 截图当前视频帧：把 `<video>` 当前画面画进离屏 canvas，再交给调用方落盘。
 *
 * 画布不挂到 DOM 上，也不改播放状态——暂停时截到的就是当前那一帧。
 * 视频还没解出画面（`readyState < 2`）或浏览器不支持画布时给一条提示，不生成空白图。
 * 视频与页面同源（走本机中间件），canvas 不会被跨域污染；真被污染（外部 URL 直接播放）
 * 时 `toDataURL` 抛错，同样由这里收成红色提示。
 */

import { useCallback, useState, type RefObject } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import { CAPTURE_FAILED_TITLE, CAPTURE_NOTICE_TITLE } from '../constants';
import type { VideoPreviewCaptureReceipt } from '../types';

/** canvas 至少要解出一帧画面：`HAVE_CURRENT_DATA` */
const READY_STATE_WITH_FRAME = 2;

/** 截图的返回：动作与进行中状态 */
export type UseFrameCaptureResult = {
  /** 截当前帧并落盘；同一时刻只允许一次 */
  capture: () => Promise<void>;
  /** 落盘请求进行中（按钮转圈、禁用） */
  capturing: boolean;
};

/**
 * 管理一次截图流程。
 *
 * @param video 视频元素引用：读的是它当前显示的那一帧
 * @param onCapture 把 data URL 交给页面落盘，并返回成功提示文案
 */
export const useFrameCapture = (
  video: RefObject<HTMLVideoElement | null>,
  onCapture: (dataUrl: string) => Promise<VideoPreviewCaptureReceipt>,
): UseFrameCaptureResult => {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async (): Promise<void> => {
    const element = video.current;

    if (!element || element.readyState < READY_STATE_WITH_FRAME) {
      notifications.show({
        autoClose: false,
        color: 'yellow',
        message: '等视频解出画面后再截图',
        title: '现在截不到画面',
      });

      return;
    }

    const canvas = document.createElement('canvas');

    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      notifications.show({
        autoClose: false,
        color: 'red',
        message: '当前浏览器不支持画布',
        title: CAPTURE_FAILED_TITLE,
      });

      return;
    }

    setCapturing(true);

    try {
      context.drawImage(element, 0, 0, canvas.width, canvas.height);

      const receipt = await onCapture(canvas.toDataURL('image/png'));

      notifications.show({
        autoClose: 4000,
        color: 'teal',
        message: receipt.message,
        title: CAPTURE_NOTICE_TITLE,
      });
    } catch (error) {
      notifications.show({
        autoClose: false,
        color: 'red',
        message: getErrorMessage(error, '保存截图失败，请稍后重试'),
        title: CAPTURE_FAILED_TITLE,
      });
    } finally {
      setCapturing(false);
    }
  }, [onCapture, video]);

  return { capture, capturing };
};
