/**
 * 截图当前视频帧：优先「进度条悬停预览的那一帧」，没有悬停才取 `<video>` 当前画面。
 *
 * 悬停帧由播放器的探针按视频原始尺寸快照（见 `FreeVideo` 的 `hoverFrameGrabberRef`），
 * 所以存下来的是全分辨率原图，不是浮层里那张缩过的缩略帧；取不到时退回主视频当前画面。
 * 视频还没解出画面（`readyState < 2`）或浏览器不支持画布时给一条提示，不生成空白图。
 * 视频与页面同源（走本机中间件），canvas 不会被跨域污染；真被污染（外部 URL 直接播放）
 * 时 `toDataURL` 抛错，同样由这里收成红色提示。
 */

import { useCallback, useRef, useState, type RefObject } from 'react';
import { notifications } from '@mantine/notifications';

import type { HoverFrameGrabber } from '@/components/file-preview/FreeVideo/types';
import { getErrorMessage } from '@/utils/error';

import { CAPTURE_FAILED_TITLE, CAPTURE_NOTICE_TITLE } from '../constants';
import type { VideoPreviewCaptureReceipt } from '../types';

/** canvas 至少要解出一帧画面：`HAVE_CURRENT_DATA` */
const READY_STATE_WITH_FRAME = 2;

/** 截图的返回：动作与进行中状态 */
export type UseFrameCaptureResult = {
  /** 截当前帧并落盘；`captureDir` 为空串表示默认目录（桌面） */
  capture: (captureDir: string) => Promise<void>;
  /** 落盘请求进行中（按钮转圈、禁用） */
  capturing: boolean;
  /** 交给播放器的 `onHoverFrameGrabberReady`：悬停帧收起时播放器回调 `null` */
  handleHoverFrameGrabberReady: (grabber: HoverFrameGrabber | null) => void;
};

/**
 * 管理一次截图流程。
 *
 * @param video 视频元素引用：没有悬停帧时读它当前显示的那一帧
 * @param onCapture 把 data URL 与目标目录交给页面落盘，并返回成功提示文案
 */
export const useFrameCapture = (
  video: RefObject<HTMLVideoElement | null>,
  onCapture: (
    dataUrl: string,
    captureDir: string,
  ) => Promise<VideoPreviewCaptureReceipt>,
): UseFrameCaptureResult => {
  const [capturing, setCapturing] = useState(false);
  /** 悬停帧快照入口：播放器在浮层显示某帧时填上，收起时清空 */
  const hoverFrameRef = useRef<HoverFrameGrabber | null>(null);

  const handleHoverFrameGrabberReady = useCallback(
    (grabber: HoverFrameGrabber | null) => {
      hoverFrameRef.current = grabber;
    },
    [],
  );

  const capture = useCallback(
    async (captureDir: string): Promise<void> => {
      /** 悬停帧优先：用户此刻看的就是它 */
      const hoverUrl = (await hoverFrameRef.current?.()) ?? null;
      const element = video.current;

      if (
        hoverUrl === null &&
        (!element || element.readyState < READY_STATE_WITH_FRAME)
      ) {
        notifications.show({
          autoClose: false,
          color: 'yellow',
          message: '等视频解出画面后再截图',
          title: '现在截不到画面',
        });

        return;
      }

      let dataUrl = hoverUrl;

      if (dataUrl === null && element !== null) {
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

        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/png');
      }

      setCapturing(true);

      try {
        if (dataUrl === null) {
          return;
        }

        const receipt = await onCapture(dataUrl, captureDir);

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
    },
    [onCapture, video],
  );

  return { capture, capturing, handleHoverFrameGrabberReady };
};
