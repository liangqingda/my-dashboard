/**
 * 进度条预览帧：用调用方渲染的一支隐藏探针 `<video>` 均匀抽帧，给进度条 hover 时展示该处画面。
 *
 * 为什么不用正在播的那个 `<video>`：抽帧要按时间点 seek，seek 一改它的 `currentTime`，
 * 画面就跟着跳走。所以播放器另挂一支 1px 的探针视频，同源同地址、只负责解码与绘制。
 *
 * 流程：等元数据 → 按「每 4 秒一帧」定出帧数（8–40 档）→ 逐个 seek 到每段中点、
 * 等画面呈现后 `drawImage` 进离屏 canvas、转 JPEG data URL 存进定长数组。
 * 每抽出一帧就更新一次数组（渐进可用）：鼠标停在靠前的位置时不必等整轮跑完。
 * 某一步超时只让那一格留空，浮层取最近的可用帧；整轮拿不到元数据就保持 `null`，
 * 进度条回落到原来的数字浮标，不报错也不影响播放。
 *
 * 一支探针一次只能 seek 一个点，所以抽帧是串行的（`captureAt` 递归下一帧），
 * 不用循环内 await。
 */

import { useEffect, useState, type RefObject } from 'react';

import {
  FALLBACK_ASPECT,
  FRAME_JPEG_QUALITY,
  FRAME_LONGEST_EDGE,
  FRAME_PRESENT_TIMEOUT,
  FRAME_SEEK_TIMEOUT,
  FRAME_TAIL_GUARD,
  MAX_FRAME_COUNT,
  MIN_FRAME_COUNT,
  PROBE_METADATA_TIMEOUT,
  READY_STATE_METADATA,
  SECONDS_PER_FRAME,
} from './constants';

/** 一帧图（JPEG data URL）；抽失败的位置留 null，按下标与时间对齐 */
export type VideoFrame = string | null;

/** 抽帧入参 */
export type UseVideoFramesOptions = {
  /** 探针视频引用：调用方渲染的隐藏 `<video preload="metadata">` */
  probeRef: RefObject<HTMLVideoElement | null>;
  /** 视频地址：换片即整轮重来 */
  src: string;
};

/** 抽帧结果 */
export type UseVideoFramesResult = {
  /** 均匀抽出的帧图，按时间顺序定长排列；整轮还没备好时为 null */
  frames: VideoFrame[] | null;
  /** 一帧覆盖的时长（秒）：浮层用「指针时间 / frameSpan」换下标 */
  frameSpan: number;
};

/** 帧数：每 4 秒一帧，短视频保底 8 帧、长视频封顶 40 帧 */
const frameCountFor = (duration: number): number =>
  Math.min(
    MAX_FRAME_COUNT,
    Math.max(MIN_FRAME_COUNT, Math.ceil(duration / SECONDS_PER_FRAME)),
  );

/** 帧图的长宽：最长边固定，比例跟视频一致；尺寸读不出来时按 16:9 兜底 */
const frameCanvasSize = (
  video: HTMLVideoElement,
): { width: number; height: number } => {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return {
      width: FRAME_LONGEST_EDGE,
      height: Math.round(FRAME_LONGEST_EDGE / FALLBACK_ASPECT),
    };
  }

  const scale = FRAME_LONGEST_EDGE / Math.max(video.videoWidth, video.videoHeight);

  return {
    width: Math.round(video.videoWidth * scale),
    height: Math.round(video.videoHeight * scale),
  };
};

/** 等元数据：已经在载的等 `loadedmetadata`，已经好了直接给时长 */
const readDuration = (video: HTMLVideoElement): Promise<number> => {
  if (
    video.readyState >= READY_STATE_METADATA &&
    Number.isFinite(video.duration) &&
    video.duration > 0
  ) {
    return Promise.resolve(video.duration);
  }

  return new Promise<number>((resolve, reject) => {
    const timerId = setTimeout(() => {
      reject(new Error('探针视频元数据超时'));
    }, PROBE_METADATA_TIMEOUT);

    video.addEventListener(
      'error',
      () => {
        clearTimeout(timerId);
        reject(new Error('探针视频加载失败'));
      },
      { once: true },
    );

    video.addEventListener(
      'loadedmetadata',
      () => {
        clearTimeout(timerId);

        if (Number.isFinite(video.duration) && video.duration > 0) {
          resolve(video.duration);

          return;
        }

        reject(new Error('探针视频时长不可用'));
      },
      { once: true },
    );
  });
};

/** seek 到某一秒：`seeked` 到了返回 true，超时返回 false（这一帧留空） */
const waitSeeked = (video: HTMLVideoElement): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const timerId = setTimeout(() => {
      resolve(false);
    }, FRAME_SEEK_TIMEOUT);

    video.addEventListener(
      'seeked',
      () => {
        clearTimeout(timerId);
        resolve(true);
      },
      { once: true },
    );
  });

/** 等画面真正呈现：有 `requestVideoFrameCallback` 就等它，没有就等一帧 rAF；超时也放行 */
const waitPresented = (video: HTMLVideoElement): Promise<void> =>
  new Promise<void>((resolve) => {
    let settled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      if (settled) {
        return;
      }

      settled = true;

      if (timerId !== null) {
        clearTimeout(timerId);
      }

      resolve();
    };

    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => settle());
    } else {
      requestAnimationFrame(() => settle());
    }

    timerId = setTimeout(settle, FRAME_PRESENT_TIMEOUT);
  });

/** 抽一轮帧：返回定长数组，抽不到的位置是 null */
export const useVideoFrames = ({
  probeRef,
  src,
}: UseVideoFramesOptions): UseVideoFramesResult => {
  const [frames, setFrames] = useState<VideoFrame[] | null>(null);
  const [frameSpan, setFrameSpan] = useState(0);

  useEffect(() => {
    const element = probeRef.current;

    if (element === null || src === '') {
      return;
    }

    /**
     * 取消开关：cleanup 里 `abort()`，异步链路每步看 `signal.aborted`。
     * 用 AbortController 而不是裸布尔——裸布尔 / 对象属性会被 TS 在闭包里窄化成恒假。
     */
    const controller = new AbortController();

    /** 取消状态：包成函数再读，避免 TS 把 `readonly` 的 `aborted` 在闭包里窄化成恒假 */
    const isCancelled = (): boolean => controller.signal.aborted;

    setFrames(null);
    setFrameSpan(0);

    const run = async (): Promise<void> => {
      try {
        const duration = await readDuration(element);

        if (isCancelled()) {
          return;
        }

        const count = frameCountFor(duration);
        const span = duration / count;
        const size = frameCanvasSize(element);
        const canvas = document.createElement('canvas');

        canvas.width = size.width;
        canvas.height = size.height;

        const context = canvas.getContext('2d');

        if (context === null) {
          return;
        }

        setFrameSpan(span);

        let collected: VideoFrame[] = Array.from({ length: count }, () => null);

        /** 抽第 index 帧，抽完接着抽下一帧；取消或抽满就停 */
        const captureAt = async (index: number): Promise<void> => {
          if (isCancelled() || index >= count) {
            return;
          }

          element.currentTime = Math.min(
            (index + 0.5) * span,
            Math.max(duration - FRAME_TAIL_GUARD, 0),
          );

          const seeked = await waitSeeked(element);

          if (isCancelled()) {
            return;
          }

          if (!seeked) {
            await captureAt(index + 1);

            return;
          }

          await waitPresented(element);

          if (isCancelled()) {
            return;
          }

          context.drawImage(element, 0, 0, canvas.width, canvas.height);

          const url = canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY);

          collected = collected.map((item, position) =>
            position === index ? url : item,
          );
          setFrames(collected);

          await captureAt(index + 1);
        };

        await captureAt(0);
      } catch {
        // 抽不到就保持 `null`（或已抽出的那部分）：进度条回落到数字浮标，不在界面上留痕迹
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [probeRef, src]);

  return { frames, frameSpan };
};
