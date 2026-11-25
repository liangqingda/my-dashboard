/**
 * 播放器控制栏：翻篇 / 播放 / 进度 / 时间 / 静音与音量。
 *
 * 翻篇箭头排在播放键两侧（常见播放器的位置），是因为「上一条 / 下一条」在这里就是前后两格；
 * 这两颗箭头的 tip 只在指上去的 1.5s 内出现，之后自己收掉，免得压在进度条上。
 * 音量条平时不占地方，指针停在喇叭上才在它上方浮出——方向朝上走，竖着排，横向宽度留给进度条。
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
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';

import { formatDuration, formatProgressLabel } from '../utils/format-duration';

import SeekPreview from './SeekPreview';
import type { SeekPreviewState, VideoControlsProps } from './types';
import { seekPreviewAt } from './utils';

import styles from './index.scss';

/** 控制栏图标的尺寸与线宽：与弹窗 header 同一档 */
const ICON_SIZE = 16;
const ICON_STROKE = 1.8;

/** 翻篇箭头比播放键略大一圈：一左一右夹着播放键，要看得出是「前后两格」 */
const STEP_ICON_SIZE = 18;

/** 翻篇箭头的 tip 只亮这么久就自己收掉：常挂在播放条上会挡住进度 */
const STEP_TIP_DURATION = 1000;

/** 竖向音量条的高度：只够看刻度与拖动，不像进度条那样占半个画面 */
const VOLUME_SLIDER_HEIGHT = 56;

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
  currentTime,
  duration,
  enabled,
  muted,
  nav,
  onPreviewFrameChange,
  onSeek,
  onToggleMute,
  onTogglePlay,
  onVolumeChange,
  playing,
  previewHeight,
  previewReady,
  previewWidth,
  requestFrame,
  volume,
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
      {nav ? (
        <FreeIconAction
          disabled={nav.onPrevious === null}
          label={nav.previousLabel ?? '上一个视频'}
          onClick={nav.onPrevious ?? undefined}
          tipDuration={STEP_TIP_DURATION}
        >
          <IconChevronLeft size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

      <FreeIconAction
        disabled={!enabled}
        label={playing ? '暂停（空格）' : '播放（空格）'}
        onClick={onTogglePlay}
      >
        {playing ? (
          <IconPlayerPauseFilled size={ICON_SIZE} />
        ) : (
          <IconPlayerPlayFilled size={ICON_SIZE} />
        )}
      </FreeIconAction>

      {nav ? (
        <FreeIconAction
          disabled={nav.onNext === null}
          label={nav.nextLabel ?? '下一个视频'}
          onClick={nav.onNext ?? undefined}
          tipDuration={STEP_TIP_DURATION}
        >
          <IconChevronRight size={STEP_ICON_SIZE} stroke={ICON_STROKE} />
        </FreeIconAction>
      ) : null}

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
          size="xs"
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

      <span className={styles.time}>
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>

      {/*
        音量：喇叭键 + 悬停浮出的竖向音量条。tip 关掉（`tooltip="none"`），
        否则提示会正好落在浮出的音量条上，两套浮层互相挡。
      */}
      <div className={styles.volumeWrap}>
        <FreeIconAction
          disabled={!enabled}
          label={muted ? '取消静音' : '静音'}
          onClick={onToggleMute}
          tooltip="none"
        >
          {muted ? (
            <IconVolumeOff size={ICON_SIZE} stroke={ICON_STROKE} />
          ) : (
            <IconVolume size={ICON_SIZE} stroke={ICON_STROKE} />
          )}
        </FreeIconAction>
        <div className={styles.volumePopover}>
          <div className={styles.volumePanel}>
            <Slider
              aria-label="音量"
              disabled={!enabled}
              /* 自带浮标贴着滑杆右侧，靠弹窗边缘会被裁掉：数字改由下面的 `volumeValue` 出 */
              label={null}
              max={1}
              onChange={onVolumeChange}
              orientation="vertical"
              size="xs"
              step={0.01}
              /* 竖向滑杆的高度只能走 styles 覆盖：Mantine 自己给竖版写死 200px，模块类压不过它 */
              styles={{ root: { height: VOLUME_SLIDER_HEIGHT } }}
              value={muted ? 0 : volume}
            />
            <span className={styles.volumeValue}>
              {Math.round((muted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;
