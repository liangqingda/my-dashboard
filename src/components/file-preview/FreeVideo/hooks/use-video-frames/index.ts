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
  FRAME_CAPTURE_PRESENT_TIMEOUT,
  FRAME_CAPTURE_RETRY_DELAY,
  FRAME_CAPTURE_RETRY_LIMIT,
  FRAME_DRAW_READY_STATE,
  FRAME_JPEG_QUALITY,
  FRAME_RETRY_OFFSET,
  FRAME_TAIL_GUARD,
} from './constants';
import {
  bucketOf,
  drawFullSizePng,
  frameCanvasSize,
  readDuration,
  seekAndPresent,
} from './utils';

/** 抽帧入参 */
export type UseVideoFramesOptions = {
  /**
   * 有人真的来要帧了（进度条 hover）：调用方可以借这个时机把探针提前挂上，
   * 不必再等「主画面就绪后那一档空档」——等帧的人不该被省盘的延时拦住。
   */
  onDemand?: () => void;
  /** 探针视频引用：调用方渲染的隐藏 `<video>` */
  probeRef: RefObject<HTMLVideoElement | null>;
  /** 视频地址：换片即清缓存重来 */
  src: string;
  /**
   * 主视频元素：同一份文件、同一次解析，时长与画面尺寸都以它为准，
   * 探针不必自己再等一遍 `loadedmetadata`——hover 一到就能直接 seek。
   */
  sourceRef?: RefObject<HTMLVideoElement | null>;
  /** 帧图最长边像素：预览框宽 × 设备像素比，窗口越大帧图越清 */
  frameLongestEdge: number;
};

/** 帧就绪回调：给这一时刻的 JPEG data URL */
export type FrameCallback = (url: string) => void;

/** 抽帧结果 */
export type UseVideoFramesResult = {
  /** 请求某一时刻的帧：命中缓存同步回调，否则排队现抽 */
  requestFrame: (time: number, onFrame: FrameCallback) => void;
  /**
   * 按视频原始尺寸抓某一时刻的一帧（PNG），给截图用；抓不到给 `null`。
   * 会借用探针 seek，但与预览不同：不写缓存、不回调，仅服务这一次调用。
   */
  grabFrame: (time: number) => Promise<string | null>;
  /** 探针是否已拿到元数据：false 时预览整块不可用 */
  ready: boolean;
  /** 探针这条路彻底废了（元数据始终拿不到，`ready` 永远不会是 true） */
  failed: boolean;
};

/** 一帧的检索与抽取单位：时间桶号 + 取帧秒数 + 拿到图后交给谁 */
type FrameJob = {
  /** 已经抽过几次（0 表示第一次）：失败后按同一位置再试一次 */
  attempts: number;
  /** 缓存键（时间桶号） */
  bucket: number;
  /** 抽好后回调 */
  onFrame: FrameCallback;
  /** seek 到的秒数 */
  time: number;
};

export const useVideoFrames = ({
  frameLongestEdge,
  onDemand,
  probeRef,
  sourceRef,
  src,
}: UseVideoFramesOptions): UseVideoFramesResult => {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  /** 时间桶号 → JPEG data URL */
  const cacheRef = useRef<Map<number, string>>(new Map());
  /** 悬停请求：只留最新一个，后来的覆盖先来的 */
  const pendingRef = useRef<FrameJob | null>(null);
  /** 抽帧循环的启动函数：effect 里换实现，卸载后置空 */
  const pumpRef = useRef<(() => void) | null>(null);
  /** 探针此刻能不能画帧：拿元数据之前进来的请求先存着，就绪后立刻补跑 */
  const readyRef = useRef(false);
  /** 请求代次：每来一个新位置的请求就加一，正在跑的旧请求看到代次变了就提前收手 */
  const latestRef = useRef(0);
  /** 暴露给截图的全尺寸抓帧：实现挂在 effect 里（要读探针与片长），卸载即置空 */
  const grabRef = useRef<((time: number) => Promise<string | null>) | null>(null);

  const requestFrame = useCallback(
    (time: number, onFrame: FrameCallback): void => {
      onDemand?.();

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
      pendingRef.current = { attempts: 0, bucket, onFrame, time };
      pumpRef.current?.();
    },
    [onDemand],
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
    readyRef.current = false;
    setFailed(false);
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
      const presented = await seekAndPresent(element, target, {
        maxTime: duration - FRAME_TAIL_GUARD,
        retryOffset: FRAME_RETRY_OFFSET,
        shouldStop: giveUp,
      });

      if (giveUp() || context === null) {
        return;
      }

      if (!presented) {
        scheduleRetry(job, generation);

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

    /**
     * 没抽到这一帧：隔一会儿按同一位置再抽一次。
     *
     * 第一次多半栽在「冷位置的数据还没读进来」，等的这几百毫秒里读流会把那一段落到缓存，
     * 第二次通常就成。不重试的话浮层会一直转圈，直到用户再动一下指针——看着就像「没反应」。
     */
    const scheduleRetry = (job: FrameJob, generation: number): void => {
      if (
        job.attempts >= FRAME_CAPTURE_RETRY_LIMIT ||
        latestRef.current !== generation
      ) {
        return;
      }

      setTimeout(() => {
        if (
          isCancelled() ||
          latestRef.current !== generation ||
          pendingRef.current !== null
        ) {
          return;
        }

        pendingRef.current = { ...job, attempts: job.attempts + 1 };
        pump();
      }, FRAME_CAPTURE_RETRY_DELAY);
    };

    /**
     * 抓一张原始尺寸的 PNG 给截图用。探针此刻未必停在那一秒上（帧图可能走了缓存），
     * 所以必要时先 seek 过去、等这一帧真的呈现再画；不写缓存，也不动预览的排队。
     *
     * 截图与预览共用一支探针，进来先把进行中的预览请求作废：否则两处同时 seek，
     * 谁拿到哪一帧都不确定。
     */
    const grabFullFrame = async (time: number): Promise<string | null> => {
      if (isCancelled() || element.readyState < FRAME_DRAW_READY_STATE) {
        return null;
      }

      latestRef.current += 1;
      pendingRef.current = null;

      const reached = await seekAndPresent(element, clampTime(time), {
        maxTime: duration - FRAME_TAIL_GUARD,
        retryOffset: FRAME_RETRY_OFFSET,
        shouldStop: isCancelled,
        timeoutMs: FRAME_CAPTURE_PRESENT_TIMEOUT,
      });

      if (!reached) {
        return null;
      }

      return drawFullSizePng(element);
    };

    grabRef.current = grabFullFrame;

    /** 取下一个任务：只有悬停请求；同一时刻被覆盖的旧请求已在 `requestFrame` 里被顶掉 */
    const takeJob = (): FrameJob | null => {
      const pending = pendingRef.current;

      pendingRef.current = null;

      return pending;
    };

    /** 串行跑任务：一支探针一次只能 seek 一个点，抽完一帧再取下一条 */
    const pump = (): void => {
      if (running || !readyRef.current) {
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

    /**
     * 定好时长与画布尺寸、打开可用开关；之后全部由 `requestFrame` 驱动。
     *
     * 主视频已经把时长与画面尺寸解出来了（同一份文件、同一次解析），就不必再等探针自己的
     * `loadedmetadata`：省掉一轮往返，hover 一到直接 seek。拿不到这两项时才退回去读探针。
     */
    const run = async (): Promise<void> => {
      try {
        const source = sourceRef?.current ?? null;
        const hintDuration = source !== null && source.duration > 0 ? source.duration : 0;
        const hintWidth = source?.videoWidth ?? 0;
        const hintHeight = source?.videoHeight ?? 0;

        duration = hintDuration > 0 ? hintDuration : await readDuration(element);

        if (isCancelled()) {
          return;
        }

        const size =
          hintWidth > 0 && hintHeight > 0
            ? frameCanvasSize(hintWidth, hintHeight, frameLongestEdge)
            : frameCanvasSize(element.videoWidth, element.videoHeight, frameLongestEdge);

        canvas.width = size.width;
        canvas.height = size.height;
        context = canvas.getContext('2d');
        readyRef.current = true;
        setReady(true);

        /**
         * 元数据还没到就 hover 的那一帧已经排在 `pendingRef` 里：
         * 就绪就立刻跑，不必等用户再动一下指针。
         */
        pump();
      } catch {
        // 拿不到元数据：这一部片子没有悬停预览，进度条回落数字浮标
        setFailed(true);
      }
    };

    pumpRef.current = pump;
    void run();

    return () => {
      controller.abort();
      grabRef.current = null;
      pumpRef.current = null;
      pendingRef.current = null;
      cacheRef.current = new Map();
    };
  }, [frameLongestEdge, probeRef, sourceRef, src]);

  const grabFrame = useCallback(
    (time: number): Promise<string | null> =>
      grabRef.current?.(time) ?? Promise.resolve(null),
    [],
  );

  return { failed, grabFrame, ready, requestFrame };
};
