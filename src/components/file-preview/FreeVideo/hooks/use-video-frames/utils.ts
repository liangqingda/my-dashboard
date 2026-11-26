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
  FRAME_RETRY_TIMEOUT,
  FRAME_SEEK_TIMEOUT,
  FRAME_TIME_BUCKET,
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

/**
 * 等元数据：已经好了直接给时长，否则等 `loadedmetadata`，出错才 reject。
 *
 * 不设超时：超时就放弃会让「第一次打开得慢一点」变成「这一整部片子永远没有悬停预览」，
 * 而等下去最多只是晚几秒变可用，用户下次 hover 就正常。
 */
export const readDuration = (video: HTMLVideoElement): Promise<number> => {
  if (
    video.readyState >= READY_STATE_METADATA &&
    Number.isFinite(video.duration) &&
    video.duration > 0
  ) {
    return Promise.resolve(video.duration);
  }

  return new Promise<number>((resolve, reject) => {
    const cleanup = (): void => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('error', onError);
    };

    function onMetadata(): void {
      cleanup();

      if (Number.isFinite(video.duration) && video.duration > 0) {
        resolve(video.duration);

        return;
      }

      reject(new Error('探针视频时长不可用'));
    }

    function onError(): void {
      cleanup();
      reject(new Error('探针视频加载失败'));
    }

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('error', onError);
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
export const waitPresented = (
  video: HTMLVideoElement,
  time: number,
  timeoutMs = FRAME_PRESENT_TIMEOUT,
): Promise<boolean> =>
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

      timerId = setTimeout(() => settle(false), timeoutMs);

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
    timerId = setTimeout(() => settle(false), timeoutMs);
  });

/** `seekAndPresent` 的选项 */
export type SeekAndPresentOptions = {
  /** 等「画面真的换过去」的上限（毫秒） */
  timeoutMs?: number;
  /** 第一次没对上时把目标再挪这么多秒重试一次；0 表示不重试 */
  retryOffset?: number;
  /** 重试时间的上限：片尾留了余量，别 seek 到片尾之后 */
  maxTime?: number;
  /** 外部已经不需要这一帧了（指针换位置 / 卸载 / 截图被顶掉） */
  shouldStop?: () => boolean;
};

/**
 * 让播放器落到 `target` 这一秒，并确认画面真的换过去了。
 *
 * 顺序是「呈现回调优先」：有 `requestVideoFrameCallback` 时以它的 `mediaTime` 为准，
 * 比 `seeked` / `readyState` 可靠——后两个会早到，画面却还停在旧位置。
 * 第一次多半只解到最近的关键帧，挪一点再 seek 一次通常就精确了；都不成才退回
 * 「数据已就绪 + 时间对得上」的老判据，避免永久等不到。
 */
export const seekAndPresent = async (
  video: HTMLVideoElement,
  target: number,
  {
    maxTime,
    retryOffset = 0,
    shouldStop = () => false,
    timeoutMs = FRAME_PRESENT_TIMEOUT,
  }: SeekAndPresentOptions = {},
): Promise<boolean> => {
  /** 参数变量只读：seek 要改 `currentTime`，先落一个本地引用 */
  const element = video;

  /** 本来就停在这一秒上（没在跳）：画面就是它，不用再跳一次 */
  if (
    !video.seeking &&
    video.readyState >= FRAME_DRAW_READY_STATE &&
    Math.abs(video.currentTime - target) <= FRAME_PRESENT_TOLERANCE
  ) {
    return true;
  }

  const hasFrameCallback = typeof video.requestVideoFrameCallback === 'function';
  /** 呈现回调要在 seek 之前挂上：暂停的播放器画完这一帧不会再触发它 */
  const presentedPromise = hasFrameCallback
    ? waitPresented(video, target, timeoutMs)
    : null;

  element.currentTime = target;

  /** 兜底：呈现回调迟迟不来时，用「数据就绪 + 时间对得上」确认 */
  const fallbackReady = async (): Promise<boolean> => {
    if (
      video.readyState >= FRAME_DRAW_READY_STATE &&
      Math.abs(video.currentTime - target) <= FRAME_PRESENT_TOLERANCE
    ) {
      return true;
    }

    return (await waitSeeked(video)) && (await waitData(video));
  };

  let presented =
    presentedPromise !== null
      ? await presentedPromise
      : (await waitSeeked(video)) && (await waitData(video));

  /** 挪一点再 seek：解码器重新落帧，通常就精确了 */
  if (!presented && hasFrameCallback && retryOffset > 0 && !shouldStop()) {
    const retryTime =
      maxTime === undefined
        ? target + retryOffset
        : Math.min(target + retryOffset, Math.max(maxTime, 0));

    if (Math.abs(retryTime - target) > Number.EPSILON) {
      const retryPromise = waitPresented(video, retryTime, FRAME_RETRY_TIMEOUT);

      element.currentTime = retryTime;
      presented = await retryPromise;
    }
  }

  if (!presented) {
    presented = await fallbackReady();
  }

  return presented;
};

/** 按视频原始尺寸画一张 PNG：截图要的是原图，不跟着预览框缩放 */
export const drawFullSizePng = (video: HTMLVideoElement): string | null => {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  const canvas = document.createElement('canvas');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');

  if (context === null) {
    return null;
  }

  try {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};
