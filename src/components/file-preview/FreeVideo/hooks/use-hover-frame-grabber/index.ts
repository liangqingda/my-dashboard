/**
 * 悬停帧快照：进度条浮层正在显示某一帧时，把「按探针当前画面抓一张全分辨率原图」的函数交出去，
 * 让外部截图存的是用户此刻看到的那一帧，而不是主视频的当前画面。
 *
 * 只认「浮层真的显示了帧」，不拿「探针停在哪」当悬停——预览收起后探针仍停在最后一处，
 * 那时按这个快照会取到一张用户已经看不见的图。
 *
 * 探针没停在那一帧上（帧图走了缓存，探针没再 seek）时退回浮层里那张缩略图：内容对得上，
 * 只是没有原始分辨率。宁可小一点，不给错帧。
 */

import { useCallback, useEffect, useRef } from 'react';

import type { HoverFrameGrabber } from '../../types';

/**
 * 把任意 data URL 的图重新编码成 PNG：落盘接口只认 PNG，
 * 而浮层里的帧是 JPEG（体积小、拿来显示正好）。转不出来就返回 `null`。
 */
const toPngDataUrl = (source: string): Promise<string | null> => {
  if (source.startsWith('data:image/png;')) {
    return Promise.resolve(source);
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext('2d');

      if (context === null) {
        resolve(null);

        return;
      }

      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = source;
  });
};

/** 入参 */
export type UseHoverFrameGrabberOptions = {
  /** 按原始尺寸抓某一秒的一帧（会先让探针 seek 过去），抓不到给 `null` */
  grabFrame: (time: number) => Promise<string | null>;
  /** 交出 / 收回抓取函数：悬停帧消失时给 `null`，调用方据此退回当前播放帧 */
  onReady?: (grabber: HoverFrameGrabber | null) => void;
};

/** 出参 */
export type UseHoverFrameGrabberResult = {
  /** 控制栏上报「哪一秒的帧正显示着、浮层里长什么样」；`null` 表示已收起或还在转圈 */
  handlePreviewFrameChange: (frame: { time: number; url: string } | null) => void;
};

export const useHoverFrameGrabber = ({
  grabFrame,
  onReady,
}: UseHoverFrameGrabberOptions): UseHoverFrameGrabberResult => {
  /** 浮层此刻显示的那一帧：时间用来核对探针位置，`url` 是没核准时的保底图 */
  const shownFrameRef = useRef<{ time: number; url: string } | null>(null);

  const handlePreviewFrameChange = useCallback(
    (frame: { time: number; url: string } | null) => {
      shownFrameRef.current = frame;
    },
    [],
  );

  useEffect(() => {
    if (!onReady) {
      return undefined;
    }

    onReady(async () => {
      const shown = shownFrameRef.current;

      if (shown === null) {
        return null;
      }

      /** 先按原始尺寸抓这一帧；抓不到（seek 超时等）再用浮层那张缩略图，至少内容是对的 */
      const full = await grabFrame(shown.time).catch(() => null);

      return full ?? (await toPngDataUrl(shown.url));
    });

    return () => onReady(null);
  }, [grabFrame, onReady]);

  return { handlePreviewFrameChange };
};
