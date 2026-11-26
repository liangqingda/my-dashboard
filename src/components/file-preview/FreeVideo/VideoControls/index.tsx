/**
 * 播放器控制栏：双层排布——上层独占进度条，下层左侧是前后 / 播放 / 时间，右侧是调用方
 * 塞进来的操作组（喇叭、选集、截图、外部打开、设置、全屏这类；B 站式排布）。
 *
 * 翻篇箭头排在播放键两侧（常见播放器的位置），是因为「上一条 / 下一条」在这里就是前后两格；
 * 这两颗箭头的 tip 只在指上去的 1.5s 内出现，之后自己收掉，免得压在进度条上。
 *
 * 进度条拖到哪就 seek 到哪（拖动过程连续 seek，松手不额外跳一次）；
 * 时长还没解出来时进度条禁用，避免 0 上限的滑块把当前时间压成 0。
 *
 * 进度条悬停预览：指针停在进度条上，上方浮出「那一秒的画面 + 时间」。
 * 在一处停够 `HOVER_SHOW_DELAY`（300ms）才浮出——从画面往下移到底部按钮时会路过进度条，
 * 划过而不是停住的就什么都不出现，不会闪一下；浮出后位置与时间跟着指针走，帧只在停稳
 * `HOVER_SETTLE_DELAY`（150ms）后换成当前这一处（帧按时间现抽，见 `hooks/use-video-frames`）：
 * 一路扫过去不抽帧，新帧回来前保持上一张，所以浮出时通常已经是画面而不是先转圈。
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Slider } from '@mantine/core';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import { cx } from '@/utils/cx';

import PlayerPauseIcon from '../PlayerIcons/PlayerPauseIcon';
import PlayerPlayIcon from '../PlayerIcons/PlayerPlayIcon';
import PlayerStepBackwardIcon from '../PlayerIcons/PlayerStepBackwardIcon';
import PlayerStepForwardIcon from '../PlayerIcons/PlayerStepForwardIcon';
import { formatDuration, formatProgressLabel } from '../utils/format-duration';

import SeekPreview from './SeekPreview';
import type { SeekPreviewState, VideoControlsProps } from './types';
import { seekPreviewAt } from './utils';

import styles from './index.scss';

/** 播放键图标尺寸；前后箭头同档 */
const PLAY_ICON_SIZE = 21;
const STEP_ICON_SIZE = 19;

/** 播放键与前后箭头的按钮边长（px）：比普通 sm 大一圈，但不撑成 lg 那种大容器 */
const CONTROL_BUTTON_SIZE = 34;

/** 翻篇箭头的 tip 只亮这么久就自己收掉：常挂在播放条上会挡住进度 */
const STEP_TIP_DURATION = 1000;

/**
 * 指针进入进度条后**在同一处**停住这么久才浮出预览（毫秒）。
 * 从画面往下移到底部按钮时会路过进度条：路过的停留远短于它，什么都还没浮出来就走了，
 * 不会闪一下；划过而不是停住的，计时随移动一直重排，也就不会在移动中冒出来。
 */
const HOVER_SHOW_DELAY = 300;

/**
 * 停稳这么久才换当前位置的帧（毫秒）。移动过程中只挪浮层与时间，帧保持上一张：
 * 一路扫过去不抽帧，探针不用被反复打断；比浮出早 150ms 发请求，浮出时通常已经是画面、
 * 而不是先转圈再出图。
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

const VideoControls = ({
  actions,
  currentTime,
  duration,
  enabled,
  nav,
  onPreviewFrameChange,
  onSeek,
  onTogglePlay,
  playing,
  previewHeight,
  previewReady,
  previewWidth,
  requestFrame,
  tipDark = false,
}: VideoControlsProps) => {
  /** 指针落在进度条上时的预览落点：null 表示浮层不显示（停留不够 / 已移开） */
  const [preview, setPreview] = useState<SeekPreviewState | null>(null);
  /**
   * 浮层里正显示的那一帧：**带上它自己的时间**——帧只在指针停稳后才换，
   * 可能落后于时间标签，截图要存的是「看到的这一帧」而不是光标此刻那一秒。
   */
  const [shownFrame, setShownFrame] = useState<{
    time: number;
    url: string;
  } | null>(null);
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

  /** 清掉浮出计时（指针离开 / 按下拖动 / 卸载都要清） */
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
   * 把「现在悬停帧显示在哪一秒」告诉播放器：弹窗按回车截图时，
   * 有悬停帧就存这一帧，没有才退回当前播放画面。
   * 时间取**帧自己的时间**：帧落后于标签时，存的仍是看到的这一帧。
   */
  useEffect(() => {
    onPreviewFrameChange(
      preview !== null && shownFrame !== null
        ? { time: shownFrame.time, url: shownFrame.url }
        : null,
    );
  }, [onPreviewFrameChange, preview, shownFrame]);

  /**
   * 收起浮层并作废还没回来的帧：离开进度条、按下拖动都走这里。
   * 号码加一让在途的请求回来时直接丢弃——否则收起后再 hover，旧图会先闪一下。
   */
  const resetPreview = () => {
    clearShowTimer();
    clearFrameTimer();
    requestTokenRef.current += 1;
    lastAskedTimeRef.current = null;
    lastClientXRef.current = null;
    spotRef.current = null;
    setPreview(null);
    setShownFrame(null);
  };

  /**
   * 取某一落点的帧：与上次请求几乎同处就不重抽（指针抖动不该反复 seek）。
   * 新帧回来之前**保持当前这张**，不先转圈——一路扫过去时反复「转圈 → 出图」才是那个闪。
   */
  const requestPreviewFrame = (spot: SeekPreviewState) => {
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

      setShownFrame({ time: spot.time, url });
    });
  };

  /**
   * 指针横向位置 → 时间与浮层位置。
   * 在一处停够 `HOVER_SHOW_DELAY` 才浮出（划过不闪）；浮出后位置与时间跟着指针走，
   * 帧等停稳 `HOVER_SETTLE_DELAY` 才换（比浮出早发请求，浮出时通常已经是画面）。
   */
  const handlePreviewMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 时长没解出来时位置摊不成时间
    if (duration <= 0) {
      return;
    }

    // 触屏没有 hover，拖进度条时不出预览
    if (event.pointerType === 'touch') {
      return;
    }

    // 按着键拖进度条：拖动过程不出预览（数字与画面都在时间那一栏看）
    if (event.buttons !== 0) {
      return;
    }

    // ±1px 的手抖不算移动：否则下面两档计时会被一直重排，浮层与帧都出不来
    const previousX = lastClientXRef.current;

    if (
      previousX !== null &&
      Math.abs(event.clientX - previousX) <= HOVER_JITTER_TOLERANCE
    ) {
      return;
    }

    lastClientXRef.current = event.clientX;

    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const next = seekPreviewAt({
      clientX: event.clientX,
      containerLeft: rect.left,
      containerWidth: rect.width,
      duration,
      previewWidth,
    });

    spotRef.current = next;

    // 换帧的请求总在停稳之后：这时浮层可能还没浮出，图先备好，省得浮出先转圈
    clearFrameTimer();
    frameTimerRef.current = setTimeout(() => {
      frameTimerRef.current = null;

      const spot = spotRef.current;

      if (previewReady && spot !== null) {
        requestPreviewFrame(spot);
      }
    }, HOVER_SETTLE_DELAY);

    // 已浮出：位置与时间跟着指针走
    if (preview !== null) {
      setPreview(next);

      return;
    }

    // 还没浮出：停住才算 hover，一移动就重排；划过（来不及停够）就什么都不出现
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;

      const spot = spotRef.current;

      // 探针还没拿到元数据：浮层出不来图，进度条继续用数字浮标（别叠两套浮层）
      if (!previewReady || spot === null) {
        return;
      }

      setPreview(spot);
    }, HOVER_SHOW_DELAY);
  };

  /** 离开进度条：收起浮层，取消还没发出的计时与在途的帧 */
  const handlePreviewLeave = () => resetPreview();

  /** 按下拖动进度条：收起浮层（数字与画面都在时间那一栏看），拖动中不再抽帧 */
  const handlePreviewDown = () => resetPreview();

  return (
    <div className={styles.controls}>
      {/* 上层：进度条独占一行，悬停预览浮层以它为定位祖先 */}
      <div
        className={styles.progressWrap}
        onPointerDown={handlePreviewDown}
        onPointerLeave={handlePreviewLeave}
        onPointerMove={handlePreviewMove}
      >
        <Slider
          aria-label="播放进度"
          className={styles.progress}
          classNames={{ label: cx(tipDark && styles.labelDark) }}
          disabled={!enabled || duration <= 0}
          /* 预览可用时数字浮标让位给帧浮层，免两套浮层叠在一起 */
          label={previewReady ? null : formatProgressLabel}
          max={duration > 0 ? duration : 1}
          onChange={onSeek}
          size="md"
          step={0.1}
          thumbLabel="播放进度"
          value={Math.min(currentTime, duration > 0 ? duration : 1)}
        />

        {preview !== null ? (
          <SeekPreview
            frame={shownFrame?.url ?? null}
            height={previewHeight}
            left={preview.left}
            time={preview.time}
            width={previewWidth}
          />
        ) : null}
      </div>

      {/* 下层：左侧前后 / 播放 / 时间，右侧调用方操作组 */}
      <div className={styles.row}>
        <div className={styles.left}>
          {nav ? (
            <FreeIconAction
              disabled={nav.onPrevious === null}
              label={nav.previousLabel ?? '上一个视频'}
              onClick={nav.onPrevious ?? undefined}
              size={CONTROL_BUTTON_SIZE}
              tipDark={tipDark}
              tipDuration={STEP_TIP_DURATION}
            >
              <PlayerStepBackwardIcon size={STEP_ICON_SIZE} />
            </FreeIconAction>
          ) : null}

          <FreeIconAction
            disabled={!enabled}
            label={playing ? '暂停（空格）' : '播放（空格）'}
            onClick={onTogglePlay}
            size={CONTROL_BUTTON_SIZE}
            tipDark={tipDark}
          >
            {playing ? (
              <PlayerPauseIcon size={PLAY_ICON_SIZE} />
            ) : (
              <PlayerPlayIcon size={PLAY_ICON_SIZE} />
            )}
          </FreeIconAction>

          {nav ? (
            <FreeIconAction
              disabled={nav.onNext === null}
              label={nav.nextLabel ?? '下一个视频'}
              onClick={nav.onNext ?? undefined}
              size={CONTROL_BUTTON_SIZE}
              tipDark={tipDark}
              tipDuration={STEP_TIP_DURATION}
            >
              <PlayerStepForwardIcon size={STEP_ICON_SIZE} />
            </FreeIconAction>
          ) : null}

          <span className={styles.time}>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        <div className={styles.right}>{actions}</div>
      </div>
    </div>
  );
};

export default VideoControls;
