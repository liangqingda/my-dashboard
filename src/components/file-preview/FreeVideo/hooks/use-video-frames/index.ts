/**
 * 进度条预览帧：指针停在哪就抽哪一帧，抽过的按时间桶缓存复用。
 *
 * 为什么不用正在播的那个 `<video>`：抽帧要按时间点 seek，seek 一改 `currentTime`，
 * 画面就跟着跳走。所以播放器另挂一支 1px 的探针视频，同源同地址、只负责解码与绘制。
 *
 * 为什么是「按需抽」而不是「预先铺满」：均匀网格的帧只在中点时间上准确，指针落在
 * 格与格之间时只能拿旧帧顶替，看起来就「差几秒」；按需抽的是指针那一刻的时间，
 * 浮层的时间标签与画面才对得上。缓存按 0.25 秒一个桶，抽过的位置再 hover 直接出图。
 *
 * 只抽被问到的位置，不预抽左右邻帧：一支探针一次只能 seek 一个点，预抽会在高码率大文件上
 * 把探针占住好几秒，指针真正停下时要等更久；抽一帧的代价全花在用户看得见的那一帧上。
 *
 * 抽不到（超时 / 数据没到 / 呈现的画面对不上这一秒）就不进缓存，回调不触发，浮层继续转圈，
 * 下次 hover 再抽；
 * 整轮拿不到元数据时 `ready` 保持 false，进度条回落到原来的数字浮标，不报错也不影响播放。
 *
 * 结果走回调而不是 state：调用方在 hover 事件里就等着这一张图，回调直接 setState，
 * 不用再为「抽好了」加一层订阅；也避免在 effect 里同步 setState。
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import {
  FRAME_CACHE_LIMIT,
  FRAME_DRAW_READY_STATE,
  FRAME_JPEG_QUALITY,
  FRAME_PRESENT_TOLERANCE,
  FRAME_RETRY_OFFSET,
  FRAME_RETRY_TIMEOUT,
  FRAME_TAIL_GUARD,
} from './constants';
import {
  bucketOf,
  frameCanvasSize,
  readDuration,
  waitData,
  waitPresented,
  waitSeeked,
} from './utils';

/** 抽帧入参 */
export type UseVideoFramesOptions = {
  /** 探针视频引用：调用方渲染的隐藏 `<video>` */
  probeRef: RefObject<HTMLVideoElement | null>;
  /** 视频地址：换片即清缓存重来 */
  src: string;
  /** 帧图最长边像素：预览框宽 × 设备像素比，窗口越大帧图越清 */
  frameLongestEdge: number;
};

/** 帧就绪回调：给这一时刻的 JPEG data URL */
export type FrameCallback = (url: string) => void;

/** 抽帧结果 */
export type UseVideoFramesResult = {
  /** 请求某一时刻的帧：命中缓存同步回调，否则排队现抽 */
  requestFrame: (time: number, onFrame: FrameCallback) => void;
  /** 探针是否已拿到元数据：false 时预览整块不可用 */
  ready: boolean;
};

/** 一帧的检索与抽取单位：时间桶号 + 取帧秒数 + 拿到图后交给谁 */
type FrameJob = {
  /** 缓存键（时间桶号） */
  bucket: number;
  /** 抽好后回调 */
  onFrame: FrameCallback;
  /** seek 到的秒数 */
  time: number;
};

export const useVideoFrames = ({
  frameLongestEdge,
  probeRef,
  src,
}: UseVideoFramesOptions): UseVideoFramesResult => {
  const [ready, setReady] = useState(false);
  /** 时间桶号 → JPEG data URL */
  const cacheRef = useRef<Map<number, string>>(new Map());
  /** 悬停请求：只留最新一个，后来的覆盖先来的 */
  const pendingRef = useRef<FrameJob | null>(null);
  /** 抽帧循环的启动函数：effect 里换实现，卸载后置空 */
  const pumpRef = useRef<(() => void) | null>(null);
  /** 请求代次：每来一个新位置的请求就加一，正在跑的旧请求看到代次变了就提前收手 */
  const latestRef = useRef(0);

  const requestFrame = useCallback(
    (time: number, onFrame: FrameCallback): void => {
      const bucket = bucketOf(time);
      const cached = cacheRef.current.get(bucket);

      if (cached !== undefined) {
        onFrame(cached);

        return;
      }

      const pending = pendingRef.current;

      // 同一个桶再来一次只换回调：位置几乎没动，别把正在跑的 seek 打断重来
      if (pending?.bucket === bucket) {
        pending.onFrame = onFrame;

        return;
      }

      latestRef.current += 1;
      pendingRef.current = { bucket, onFrame, time };
      pumpRef.current?.();
    },
    [],
  );

  useEffect(() => {
    const element = probeRef.current;

    if (element === null || src === '') {
      return;
    }

    /**
     * 取消开关：cleanup 里 `abort()`，异步链路每步看 `isCancelled()`。
     * 用 AbortController 而不是裸布尔——裸布尔 / 对象属性会被 TS 在闭包里窄化成恒假。
     */
    const controller = new AbortController();
    const isCancelled = (): boolean => controller.signal.aborted;

    cacheRef.current = new Map();
    pendingRef.current = null;
    latestRef.current = 0;
    setReady(false);

    const canvas = document.createElement('canvas');
    let context: CanvasRenderingContext2D | null = null;
    let duration = 0;
    let running = false;

    /** 取帧时间夹在片内：片尾留一点余量，避免停在最后一帧 */
    const clampTime = (time: number): number =>
      Math.min(Math.max(time, 0), Math.max(duration - FRAME_TAIL_GUARD, 0));

    /** 抽一帧：seek → 等这一帧真的呈现 → 画进离屏 canvas → 存成 JPEG data URL → 回调 */
    const capture = async (job: FrameJob): Promise<void> => {
      /** 这一趟开始时的代次：指针已经换到别处就不要再等这一帧了 */
      const generation = latestRef.current;
      /** 过期 / 卸载：seek 到新位置会打断旧 seek，不必等旧的超时 */
      const giveUp = (): boolean => isCancelled() || latestRef.current !== generation;

      const target = clampTime(job.time);
      const hasFrameCallback =
        typeof element.requestVideoFrameCallback === 'function';
      /**
       * 呈现回调要在 seek 之前就挂上：探针是暂停的，帧一旦画出来就不会再触发
       * `requestVideoFrameCallback`，seeked 之后再注册会错过唯一那次回调，永远等不到。
       *
       * 有它就以它为准：`mediaTime` 命中目标时间即证明「数据到了 + 这一帧画出来了」，
       * 不必再等 `seeked` / `readyState`（那两个信号有时来得晚，白等几秒）。
       */
      const presentedPromise = hasFrameCallback
        ? waitPresented(element, target)
        : null;

      element.currentTime = target;

      /**
       * 兜底：`requestVideoFrameCallback` 迟迟不回调时（部分环境里暂停的探针只在尺寸 / 可见性变化时
       * 才推帧），退回「当前帧数据已就绪 + 时间对得上」这条老判据，避免整块永久转圈。
       */
      const fallbackReady = async (): Promise<boolean> => {
        if (
          element.readyState >= FRAME_DRAW_READY_STATE &&
          Math.abs(element.currentTime - target) <= FRAME_PRESENT_TOLERANCE
        ) {
          return true;
        }

        return (await waitSeeked(element)) && (await waitData(element));
      };

      /** 没有 `requestVideoFrameCallback` 的浏览器退回老路：等 seeked + 数据可用 */
      let presented =
        presentedPromise !== null
          ? await presentedPromise
          : (await waitSeeked(element)) && (await waitData(element));

      /**
       * 第一次没对上多半是「只解到最近的关键帧」：把指针位置挪一丁点再 seek 一次，
       * 解码器重新落帧后通常就精确了。这一步比直接画关键帧强——画关键帧就是「差几秒」的来源。
       */
      if (!presented && hasFrameCallback && !giveUp()) {
        const retryTime = clampTime(target + FRAME_RETRY_OFFSET);

        if (Math.abs(retryTime - target) > Number.EPSILON) {
          const retryPromise = waitPresented(
            element,
            retryTime,
            FRAME_RETRY_TIMEOUT,
          );

          element.currentTime = retryTime;
          presented = await retryPromise;
        }
      }

      if (!presented) {
        presented = await fallbackReady();
      }

      if (giveUp() || context === null || !presented) {
        return;
      }

      context.drawImage(element, 0, 0, canvas.width, canvas.height);

      const url = canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY);
      const cache = cacheRef.current;

      cache.set(job.bucket, url);

      if (cache.size > FRAME_CACHE_LIMIT) {
        const oldest = cache.keys().next().value;

        if (oldest !== undefined) {
          cache.delete(oldest);
        }
      }

      job.onFrame(url);
    };

    /** 取下一个任务：只有悬停请求；同一时刻被覆盖的旧请求已在 `requestFrame` 里被顶掉 */
    const takeJob = (): FrameJob | null => {
      const pending = pendingRef.current;

      pendingRef.current = null;

      return pending;
    };

    /** 串行跑任务：一支探针一次只能 seek 一个点，抽完一帧再取下一条 */
    const pump = (): void => {
      if (running) {
        return;
      }

      running = true;

      const step = async (): Promise<void> => {
        if (isCancelled()) {
          running = false;

          return;
        }

        const job = takeJob();

        if (job === null) {
          running = false;

          return;
        }

        await capture(job);
        await step();
      };

      void step();
    };

    /** 等元数据 → 定好画布尺寸 → 打开可用开关；之后全部由 `requestFrame` 驱动 */
    const run = async (): Promise<void> => {
      try {
        const seconds = await readDuration(element);

        if (isCancelled()) {
          return;
        }

        duration = seconds;

        const size = frameCanvasSize(element, frameLongestEdge);

        canvas.width = size.width;
        canvas.height = size.height;
        context = canvas.getContext('2d');
        setReady(true);
      } catch {
        // 拿不到元数据：预览保持不可用，进度条回落数字浮标，界面上不留痕迹
      }
    };

    pumpRef.current = pump;
    void run();

    return () => {
      controller.abort();
      pumpRef.current = null;
      pendingRef.current = null;
      cacheRef.current = new Map();
    };
  }, [frameLongestEdge, probeRef, src]);

  return { ready, requestFrame };
};
