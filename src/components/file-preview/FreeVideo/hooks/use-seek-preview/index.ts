/**
 * 进度条悬停预览的时序与状态：什么时候浮出、什么时候换帧、帧跟上哪一秒。
 *
 * 两道门槛：在**同一处**停住 `HOVER_SHOW_DELAY`（300ms）才浮出——从画面往下移到底部按钮
 * 会路过进度条，划过而不是停住的就什么都不出现，不会闪一下；浮出后落点与时间跟着指针走，
 * 帧只在停稳 `HOVER_SETTLE_DELAY`（150ms）后换（比浮出早 150ms 发请求，浮出时通常已经是画面、
 * 而不是先转圈）。移动过程中保留上一张：一路扫过去不抽帧，探针不用被反复打断。
 *
 * 浮出**不看探针就绪**：就绪与否是「帧到没到」的事，不是「要不要回话」的事。早 hover 的时候
 * 探针可能还在拿元数据，两档计时要是都卡在就绪上，指针不动就永远等不到——看起来就是
 * 「hover 了、几秒没反应」。所以照常浮出、浮层里转圈，请求照发（`use-video-frames` 会存着，
 * 探针一就绪就抽）。
 *
 * 停着不动的鼠标也会送 ±1px 的 move，那不算移动——算进去的话两档计时被一直重排，
 * 浮层与帧都出不来。
 *
 * 帧与它的时间**绑在一起**交给调用方：帧落后于时间标签时（指针刚挪、新帧还没到），
 * 截图要存的是「看到的这一帧」，不是光标此刻那一秒。
 */

import { useEffect, useRef, useState } from 'react';

import type { SeekPreviewState } from '../../VideoControls/types';

/**
 * 指针进入进度条后在同一处停住这么久才浮出预览（毫秒）。
 * 路过进度条的停留远短于它；划过而不是停住的，计时随移动一直重排，也就不会冒出来。
 */
const HOVER_SHOW_DELAY = 300;

/**
 * 停稳这么久才换当前位置的帧（毫秒）。比浮出早 150ms 发请求，
 * 浮出时通常已经是画面，而不是先转圈再出图。
 */
const HOVER_SETTLE_DELAY = 150;

/**
 * 指针横坐标的抖动容差（像素）：停着不动的鼠标也会送 ±1px 的 move，
 * 若把它算成「还在移动」，浮出与换帧的计时就永远被重排，面板和帧都出不来。
 */
const HOVER_JITTER_TOLERANCE = 3;

/**
 * 与上次请求的时间差小于这个值就当作「还在同一处」，不重发抽帧、继续用当前这张。
 *
 * 单位是秒，但按像素换算：进度条 220px 摊在 60 秒上，1px ≈ 0.27 秒。鼠标停着不动也会有
 * ±1px 的抖动，阈值小于 1px 就等于每次抖动都重新 seek 一次，正在解码的那一帧永远被打断
 * ——表现就是「hover 之后一直转圈、frame 不出来」。0.6 秒 ≈ 2px，抖动被吃掉，真的挪动了照常换图。
 */
const SAME_SPOT_EPSILON = 0.6;

/** 浮层里正显示的那一帧：带它自己的时间，与画面同源 */
export type SeekPreviewFrame = {
  /** 这一帧对应的秒数：截图按它取帧 */
  time: number;
  /** 帧图（浮层里的缩略图 data URL） */
  url: string;
};

/** 悬停预览入参 */
export type UseSeekPreviewOptions = {
  /** 抽帧这条路还能不能用（探针元数据始终拿不到时为 false）：不能时干脆不浮出，进度条用数字浮标 */
  framesAvailable: boolean;
  /** 请求某一时刻的帧：已缓存同步回调，否则排队现抽 */
  requestFrame: (time: number, onFrame: (url: string) => void) => void;
  /** 浮层正显示的那一帧（收起 / 还没出图时给 `null`）：截图按它决定存哪一帧 */
  onPreviewFrameChange: (frame: SeekPreviewFrame | null) => void;
};

/** 悬停预览结果 */
export type UseSeekPreviewResult = {
  /** 指针落点：`null` 表示浮层不显示（停得不够久 / 已移开） */
  preview: SeekPreviewState | null;
  /** 浮层里正显示的那一帧（自带时间）；还在抽时为 `null`，浮层转圈 */
  frame: SeekPreviewFrame | null;
  /** 指针移到某落点：`clientX` 只用来判手抖 */
  move: (spot: SeekPreviewState, clientX: number) => void;
  /** 指针离开进度条：收起浮层，作废还没发出的计时与在途的帧 */
  leave: () => void;
  /** 按下拖动进度条：收起浮层（数字与画面都在时间那一栏看），拖动中不出预览 */
  down: () => void;
};

export const useSeekPreview = ({
  framesAvailable,
  onPreviewFrameChange,
  requestFrame,
}: UseSeekPreviewOptions): UseSeekPreviewResult => {
  /** 指针落点：null 表示浮层不显示 */
  const [preview, setPreview] = useState<SeekPreviewState | null>(null);
  const [frame, setFrame] = useState<SeekPreviewFrame | null>(null);
  /** 指针此刻的落点：浮出与停稳换帧都按它取，不必等下一次 move */
  const spotRef = useRef<SeekPreviewState | null>(null);
  /** 浮出的待办计时：在一处停够 `HOVER_SHOW_DELAY` 才浮出，移动就重排 */
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 停稳换帧的待办计时：每次移动都重排，停稳后抽当前位置 */
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 上一次算作「真的移动了」的横坐标：用来吃掉 ±1px 的手抖 */
  const lastClientXRef = useRef<number | null>(null);
  /** 请求序号：抽好的图回来时指针已经移开 / 浮层已收起，就不要它了，免得乱序覆盖 */
  const requestTokenRef = useRef(0);
  /** 上一次真正发起抽帧的时间（秒）：用来判断「还停在同一处」 */
  const lastAskedTimeRef = useRef<number | null>(null);

  /** 清掉浮出计时（离开 / 按下拖动 / 卸载都要清） */
  const clearShowTimer = () => {
    if (showTimerRef.current === null) {
      return;
    }

    clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  };

  /** 清掉停稳换帧的计时 */
  const clearFrameTimer = () => {
    if (frameTimerRef.current === null) {
      return;
    }

    clearTimeout(frameTimerRef.current);
    frameTimerRef.current = null;
  };

  useEffect(
    () => () => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      if (frameTimerRef.current !== null) {
        clearTimeout(frameTimerRef.current);
        frameTimerRef.current = null;
      }
    },
    [],
  );

  /**
   * 把「现在浮层里显示的是哪一帧」告诉调用方：截图有悬停帧就存这一帧，
   * 没有才退回当前播放画面。时间取**帧自己的时间**，不是指针此刻那一秒。
   */
  useEffect(() => {
    onPreviewFrameChange(
      preview !== null && frame !== null
        ? { time: frame.time, url: frame.url }
        : null,
    );
  }, [frame, onPreviewFrameChange, preview]);

  /**
   * 收起浮层并作废还没回来的帧：离开、按下拖动都走这里。
   * 号码加一让在途的请求回来时直接丢弃——否则收起后再 hover，旧图会先闪一下。
   */
  const reset = () => {
    clearShowTimer();
    clearFrameTimer();
    requestTokenRef.current += 1;
    lastAskedTimeRef.current = null;
    lastClientXRef.current = null;
    spotRef.current = null;
    setPreview(null);
    setFrame(null);
  };

  /**
   * 取某一落点的帧：与上次请求几乎同处就不重抽（指针抖动不该反复 seek）。
   * 新帧回来之前**保持当前这张**，不先转圈——一路扫过去时反复「转圈 → 出图」才是那个闪。
   */
  const requestPreviewFrame = (spot: SeekPreviewState): void => {
    const previous = lastAskedTimeRef.current;
    const sameSpot =
      previous !== null && Math.abs(previous - spot.time) < SAME_SPOT_EPSILON;

    /**
     * 还在同一处：图继续用当前这张，不重抽。注意基准只在真发请求时更新——
     * 否则一点点挪过去的偏差会累积进基准，慢慢挪动就永远跨不过阈值、帧一直不换。
     */
    if (sameSpot) {
      return;
    }

    /** 请求序号只在真的换位置时递增：抖动被上面挡掉，就不能把正在跑的那一帧作废 */
    const token = requestTokenRef.current + 1;

    requestTokenRef.current = token;
    lastAskedTimeRef.current = spot.time;
    requestFrame(spot.time, (url) => {
      if (requestTokenRef.current !== token) {
        return;
      }

      setFrame({ time: spot.time, url });
    });
  };

  /**
   * 指针移到某落点：浮出前后两套节奏——没浮出时停够才浮出（划过不闪），
   * 浮出后落点与时间跟着走、帧等停稳才换。
   */
  const move = (spot: SeekPreviewState, clientX: number) => {
    // ±1px 的手抖不算移动：否则下面两档计时会被一直重排，浮层与帧都出不来
    const previousX = lastClientXRef.current;

    if (
      previousX !== null &&
      Math.abs(clientX - previousX) <= HOVER_JITTER_TOLERANCE
    ) {
      return;
    }

    lastClientXRef.current = clientX;
    spotRef.current = spot;

    // 换帧的请求总在停稳之后：这时浮层可能还没浮出，图先备好，省得浮出先转圈
    clearFrameTimer();
    frameTimerRef.current = setTimeout(() => {
      frameTimerRef.current = null;

      const next = spotRef.current;

      if (framesAvailable && next !== null) {
        requestPreviewFrame(next);
      }
    }, HOVER_SETTLE_DELAY);

    // 已浮出：位置与时间跟着指针走
    if (preview !== null) {
      setPreview(spot);

      return;
    }

    // 还没浮出：停住才算 hover，一移动就重排；划过（来不及停够）就什么都不出现
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;

      const next = spotRef.current;

      // 这一部片子抽不出帧：别摆一个永远转圈的浮层，进度条继续用数字浮标
      if (!framesAvailable || next === null) {
        return;
      }

      setPreview(next);
    }, HOVER_SHOW_DELAY);
  };

  return { frame, leave: reset, move, preview, down: reset };
};
