/**
 * 抽帧用的纯函数与 DOM 等待：时间桶、画布尺寸，以及
 * 「等元数据 / 等 seeked / 等画面呈现」三个没有 React 依赖的 Promise 包装。
 *
 * 放在 hook 外面只为让编排逻辑读起来短一些：这一份没有任何状态，可以单独测。
 */

import { VIDEO_FALLBACK_ASPECT } from '../../constants';

import {
  FRAME_DATA_POLL,
  FRAME_DATA_TIMEOUT,
  FRAME_DRAW_READY_STATE,
  FRAME_PRESENT_TIMEOUT,
  FRAME_PRESENT_TOLERANCE,
  FRAME_SEEK_TIMEOUT,
  FRAME_TIME_BUCKET,
  PROBE_METADATA_TIMEOUT,
  READY_STATE_METADATA,
} from './constants';

/** 时间 → 缓存桶号：同一个桶内 hover 复用同一张图 */
export const bucketOf = (time: number): number => Math.round(time / FRAME_TIME_BUCKET);

/** 帧图的长宽：按最长边缩放，源本身比目标还小就不放大；尺寸读不出来时按 16:9 兜底 */
export const frameCanvasSize = (
  video: HTMLVideoElement,
  longestEdge: number,
): { width: number; height: number } => {
  if (!Number.isFinite(longestEdge) || longestEdge <= 0) {
    return { height: 1, width: 1 };
  }

  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return {
      height: Math.round(longestEdge / VIDEO_FALLBACK_ASPECT),
      width: longestEdge,
    };
  }

  const scale = Math.min(1, longestEdge / Math.max(video.videoWidth, video.videoHeight));

  return {
    height: Math.round(video.videoHeight * scale),
    width: Math.round(video.videoWidth * scale),
  };
};

/** 等元数据：已经好了直接给时长，否则等 `loadedmetadata`（超时 / 出错都 reject） */
export const readDuration = (video: HTMLVideoElement): Promise<number> => {
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

/** seek 到某一秒：`seeked` 到了返回 true，超时返回 false（这一帧不进缓存） */
export const waitSeeked = (video: HTMLVideoElement): Promise<boolean> =>
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

/**
 * 等「当前帧数据真的可用」：`seeked` 只是跳转完成，数据可能还没到（`readyState` 仍是元数据档），
 * 这时 `drawImage` 会画出空白。事件不一定齐（`loadeddata` / `canplay` 可能已过去），所以再轮询兜住。
 */
export const waitData = (video: HTMLVideoElement): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    let settled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const settle = (available: boolean) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timerId !== null) {
        clearTimeout(timerId);
      }

      resolve(available);
    };

    /** 剩余时间到了就按当前档位结算：够画就画，不够就放弃这一帧 */
    const poll = (remaining: number) => {
      if (video.readyState >= FRAME_DRAW_READY_STATE) {
        settle(true);

        return;
      }

      if (remaining <= 0) {
        settle(false);

        return;
      }

      timerId = setTimeout(() => poll(remaining - FRAME_DATA_POLL), FRAME_DATA_POLL);
    };

    video.addEventListener('loadeddata', () => settle(true), { once: true });
    video.addEventListener('canplay', () => settle(true), { once: true });
    poll(FRAME_DATA_TIMEOUT);
  });

/**
 * 等「呈现出来的确实是 seek 那一帧」：`seeked` 只代表跳转完成，画面上仍可能是上一次的位置。
 * 有 `requestVideoFrameCallback` 时用它给的 `mediaTime` 校验，对不上就接着等下一帧；
 * 超时或校验一直不通过返回 false，调用方丢掉这一帧，宁可转圈也不画错时间。
 */
export const waitPresented = (video: HTMLVideoElement, time: number): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    let settled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const settle = (presented: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;

      if (timerId !== null) {
        clearTimeout(timerId);
      }

      resolve(presented);
    };

    if (typeof video.requestVideoFrameCallback !== 'function') {
      requestAnimationFrame(() => settle(true));

      timerId = setTimeout(() => settle(false), FRAME_PRESENT_TIMEOUT);

      return;
    }

    /** 拿到一帧就核 `mediaTime`：落在目标附近才算这一帧真的画出来了 */
    const watch = (): void => {
      video.requestVideoFrameCallback((_, metadata) => {
        if (settled) {
          return;
        }

        if (Math.abs(metadata.mediaTime - time) <= FRAME_PRESENT_TOLERANCE) {
          settle(true);

          return;
        }

        watch();
      });
    };

    watch();
    timerId = setTimeout(() => settle(false), FRAME_PRESENT_TIMEOUT);
  });
