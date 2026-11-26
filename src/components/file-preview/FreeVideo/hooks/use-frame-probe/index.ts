/**
 * 抽帧探针的生命周期：什么时候把地址交给那支隐藏 `<video>`，以及换片 / 关窗时怎么把
 * 在途的读流当场掐掉。放在这里而不是播放器主体里，是因为它同时要管主视频与探针两支元素。
 */

import { useEffect, useRef, useState, type RefObject } from 'react';

import { PROBE_ARM_DELAY } from '../../constants';

/** 入参：两支元素 + 主视频状态 */
export type UseFrameProbeOptions = {
  /** 主视频元素：卸载时一起断流 */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** 抽帧探针元素 */
  probeRef: RefObject<HTMLVideoElement | null>;
  /** 主视频是否已解出画面（`ready`） */
  ready: boolean;
  /** 视频地址 */
  src: string;
};

/** 出参：探针该挂的地址 */
export type UseFrameProbeResult = {
  /** 交给探针 `src` 的地址；没到点为空串——`<video src="">` 会被当成当前页地址去请求，必须挂 `undefined` */
  probeSrc: string;
};

/** 断流：暂停并把源摘掉，让在途的 Range 请求当场结束 */
const release = (element: HTMLVideoElement): void => {
  element.pause();
  element.removeAttribute('src');
  element.load();
};

export const useFrameProbe = ({
  probeRef,
  ready,
  src,
  videoRef,
}: UseFrameProbeOptions): UseFrameProbeResult => {
  /** 探针是否已经挂上地址 */
  const [armed, setArmed] = useState(false);
  /**
   * 这一轮的 effect 是否还活着。StrictMode 在开发模式下走「挂载 → 卸载 → 再挂载」，
   * 两次都在同一个 tick 里同步发生；断流延后到微任务再判这个标记，
   * 就不会把刚起来的这条流误掐（真卸载时没人再把它置回 true）。
   */
  const liveRef = useRef(false);

  /** 主画面就绪后再给一档空档：首帧解码、首段缓冲最吃盘的那一刻不叠第二条流 */
  useEffect(() => {
    if (!ready) {
      return;
    }

    const timer = setTimeout(() => setArmed(true), PROBE_ARM_DELAY);

    return () => clearTimeout(timer);
  }, [ready]);

  /**
   * 换片 / 关窗时把两路流当场掐掉：`key` 重挂虽然会移除元素，但浏览器收掉在途的 Range
   * 请求还要等一轮——连翻几条时它们会一直占着连接与读盘，新片子的元数据就得排队。
   */
  useEffect(() => {
    const main = videoRef.current;
    const probe = probeRef.current;

    liveRef.current = true;

    return () => {
      liveRef.current = false;

      queueMicrotask(() => {
        if (liveRef.current) {
          return;
        }

        for (const element of [main, probe]) {
          if (element !== null) {
            release(element);
          }
        }
      });
    };
  }, [probeRef, videoRef]);

  return { probeSrc: armed ? src : '' };
};
