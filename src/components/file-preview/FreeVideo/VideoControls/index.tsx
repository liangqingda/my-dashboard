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
 * 帧按指针落下的时间现抽（见 `hooks/use-video-frames`），停下 80ms 才发请求，
 * 免得扫过去的过程中把探针一路 seek；移动中不换图，抽到后整块换一次——
 * 不会出现「先一张、再换一张」的闪动。停下换到没抽过的位置时先转圈，
 * 帧到了再一次性出现，避免「时间已经变了、画面还是上一处」的错配。
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Slider } from '@mantine/core';

import FreeIconAction from '@/components/buttons/FreeIconAction';

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

/** 指针停下多久才去抽那一帧（毫秒）：扫过去的途中不抽，探针不用一路 seek */
const HOVER_REQUEST_DELAY = 80;

/**
 * 与上次请求的时间差小于这个值就当作「还在同一处」，只更新浮层位置与时间、不重发抽帧。
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
}: VideoControlsProps) => {
  /** 指针落在进度条上时的预览落点：null 表示不显示 */
  const [preview, setPreview] = useState<SeekPreviewState | null>(null);
  /** 已显示的那一帧：指针移动过程中保持不动，停下抽到新位置的帧再整块换掉 */
  const [shownFrame, setShownFrame] = useState<string | null>(null);
  /** 停下后才发起的抽帧请求 */
  const requestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 请求序号：抽好的图回来时指针已经移开，就不要它了，免得乱序覆盖 */
  const requestTokenRef = useRef(0);
  /** 上一次真正发起抽帧的时间（秒）：用来判断「还停在同一处」 */
  const lastAskedTimeRef = useRef<number | null>(null);

  /** 清掉待发的抽帧请求（指针离开 / 按下拖动 / 卸载都要清） */
  const clearRequestTimer = () => {
    if (requestTimerRef.current === null) {
      return;
    }

    clearTimeout(requestTimerRef.current);
    requestTimerRef.current = null;
  };

  useEffect(() => clearRequestTimer, []);

  /**
   * 把「现在悬停帧显示在哪一秒」告诉播放器：弹窗按回车截图时，
   * 有悬停帧就存这一帧，没有才退回当前播放画面。
   */
  useEffect(() => {
    onPreviewFrameChange(
      preview !== null && shownFrame !== null
        ? { time: preview.time, url: shownFrame }
        : null,
    );
  }, [onPreviewFrameChange, preview, shownFrame]);

  /** 指针横向位置 → 时间与浮层位置；停下 80ms 再抽这一秒的帧 */
  const handlePreviewMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 时长没解出来时位置摊不成时间；探针还没就绪只出浮层，等它好了下一次 hover 就能抽
    if (duration <= 0) {
      return;
    }

    // 触屏没有 hover，拖进度条时不出预览
    if (event.pointerType === 'touch') {
      return;
    }

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

    setPreview(next);
    clearRequestTimer();

    // 探针还没拿到元数据：先把浮层摆出来告诉用户「这一处在哪」，帧等它就绪再抽
    if (!previewReady) {
      return;
    }

    requestTimerRef.current = setTimeout(() => {
      requestTimerRef.current = null;

      const previous = lastAskedTimeRef.current;
      const sameSpot =
        previous !== null && Math.abs(previous - next.time) < SAME_SPOT_EPSILON;

      lastAskedTimeRef.current = next.time;

      // 还在同一处：图继续用当前这张，只把浮层挪到新位置，不重抽
      if (sameSpot) {
        return;
      }

      /** 请求序号只在真的换位置时递增：抖动被上面挡掉，就不能把正在跑的那一帧作废 */
      const token = requestTokenRef.current + 1;

      requestTokenRef.current = token;
      // 换位置的这一帧还没到就先转圈：留着上一张会变成「时间变了、画面还是老位置」
      setShownFrame(null);
      requestFrame(next.time, (url) => {
        if (requestTokenRef.current !== token) {
          return;
        }

        setShownFrame(url);
      });
    }, HOVER_REQUEST_DELAY);
  };

  /** 离开进度条：收起浮层，取消还没发出的抽帧 */
  const handlePreviewLeave = () => {
    clearRequestTimer();
    lastAskedTimeRef.current = null;
    setPreview(null);
    setShownFrame(null);
  };

  /** 按下拖动进度条：收起浮层（数字与画面都在时间那一栏看），拖动中不再抽帧 */
  const handlePreviewDown = () => {
    clearRequestTimer();
    lastAskedTimeRef.current = null;
    setPreview(null);
    setShownFrame(null);
  };

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
            frame={shownFrame}
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
